// ──────────────────────────────────────────────────
//  BIGSTACK — Error Handler Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Catches ALL errors from commands and middleware.
//  - Logs locally
//  - Sends to ERRORS group (full stack + context)
//  - Replies to user with a friendly message
//  - Never crashes the bot
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const scheduler = require("../core/scheduler");
const { GrammyError, HttpError } = require("grammy");

// ─── Track duplicate errors (avoid spam) ────────────
// Same error signature within 60s → counted, not re-sent
const recentErrors = new Map();
const DEDUP_WINDOW_MS = 60 * 1000;

// ─── Get a short fingerprint of an error ────────────
function fingerprint(error) {
    const msg = (error?.message || "unknown").slice(0, 100);
    const loc = (error?.stack || "").split("\n")[1]?.trim().slice(0, 80) || "";
    return `${error?.name || "Error"}|${msg}|${loc}`;
}

// ─── Check if this error was sent recently ──────────
function isDuplicate(error) {
    const key = fingerprint(error);
    const now = Date.now();
    const prev = recentErrors.get(key);

    if (prev && now - prev.firstSeen < DEDUP_WINDOW_MS) {
        prev.count++;
        prev.lastSeen = now;
        return { duplicate: true, count: prev.count };
    }

    recentErrors.set(key, { firstSeen: now, lastSeen: now, count: 1 });

    // Clean old entries
    if (recentErrors.size > 200) {
        for (const [k, v] of recentErrors.entries()) {
            if (now - v.lastSeen > DEDUP_WINDOW_MS * 2) {
                recentErrors.delete(k);
            }
        }
    }

    return { duplicate: false, count: 1 };
}

// ─── Friendly reply for the user ────────────────────
function friendlyMessage(error) {
    const msg = error?.message || "";

    // API / network issues
    if (msg.includes("All") && msg.includes("providers failed")) {
        return "❌ *Service unavailable*\n\nOur servers are having trouble. Please try again in a moment.";
    }
    if (msg.includes("timeout") || error?.code === "ECONNABORTED") {
        return "⏳ *Request timed out*\n\nPlease try again in a moment.";
    }
    if (error?.response?.status === 429) {
        return "⏳ *Slow down!*\n\nYou're sending too many requests. Wait a minute.";
    }
    if (error?.response?.status === 404) {
        return "❌ *Not found*\n\nThe content doesn't exist or has been removed.";
    }
    if (error?.response?.status >= 500) {
        return "🔧 *Server error*\n\nSomething broke on our side. Try again soon.";
    }

    // Telegram-specific
    if (error instanceof GrammyError) {
        if (msg.includes("blocked")) {
            return null; // user blocked the bot — don't reply
        }
        if (msg.includes("chat not found")) {
            return null; // can't reply to a dead chat
        }
        if (msg.includes("too large")) {
            return "📦 *File too large*\n\nTelegram can't handle files this big.";
        }
    }

    if (error instanceof HttpError) {
        return "🌐 *Network error*\n\nCouldn't reach Telegram. Trying again...";
    }

    // Fallback
    return config.messages?.error || "❌ Something went wrong. Please try again later.";
}

// ─── Safe reply (never throws) ──────────────────────
async function safeReply(ctx, text) {
    if (!text) return;
    try {
        await ctx.reply(text, { parse_mode: "Markdown" });
    } catch {
        // If Markdown fails (bad chars), try plain
        try {
            await ctx.reply(text.replace(/[*_`\[\]]/g, ""));
        } catch {
            // Give up — user might have blocked the bot
        }
    }
}

// ══════════════════════════════════════════════════
//  MAIN MIDDLEWARE
// ══════════════════════════════════════════════════

async function errorHandler(ctx, next) {
    const startTime = Date.now();

    try {
        await next();

        // Track successful command completion
        if (ctx.commandName) {
            scheduler.trackCommand(ctx.commandName, ctx.from?.id);
        }

    } catch (error) {
        const elapsed = Date.now() - startTime;

        // ─── 1. Log locally ─────────────────────────
        logger.error(`[error] ${error.message}`);
        if (error.stack) logger.debug(error.stack);

        // ─── 2. Track for stats ─────────────────────
        scheduler.trackError();

        // ─── 3. Deduplicate ─────────────────────────
        const dedup = isDuplicate(error);

        // ─── 4. Build context for the group ─────────
        const context = {
            command: ctx.commandName || "unknown",
            user: ctx.from
                ? `${ctx.from.first_name || ""} (@${ctx.from.username || "no-username"}) [${ctx.from.id}]`
                : "unknown",
            chatType: ctx.chat?.type || "unknown",
            chatId: ctx.chat?.id || "unknown",
            input: ctx.args?.length ? ctx.args.join(" ") : ctx.match || "",
            provider: error.provider || null,
            metadata: {
                elapsed: `${elapsed}ms`,
                updateId: ctx.update?.update_id,
                messageId: ctx.message?.message_id,
                isGroup: ctx.chat?.type === "group" || ctx.chat?.type === "supergroup",
                isDm: ctx.chat?.type === "private",
                language: ctx.from?.language_code
            }
        };

        // ─── 5. Send to ERRORS group (unless duplicate) ───
        if (!dedup.duplicate) {
            await logger.errorToGroup(error, context).catch(() => {});
        } else if (dedup.count === 3 || dedup.count === 10) {
            // Send a "still happening" ping at 3x and 10x
            const ping = new Error(
                `[RECURRING x${dedup.count}] ${error.message}`
            );
            ping.stack = error.stack;
            await logger.errorToGroup(ping, context).catch(() => {});
        }

        // ─── 6. Reply to user (friendly) ────────────
        const friendly = friendlyMessage(error);
        if (friendly) {
            await safeReply(ctx, friendly);
        }

        // ─── 7. Don't rethrow — bot stays alive ─────
        // (If we rethrew, grammY's bot.catch would handle it,
        //  but we want to control the reply + logging.)
    }
}

// ─── Cleanup function (call on shutdown) ────────────
function cleanup() {
    recentErrors.clear();
}

// ─── Export ─────────────────────────────────────────
module.exports = errorHandler;
module.exports.cleanup = cleanup;