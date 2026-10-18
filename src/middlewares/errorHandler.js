// ──────────────────────────────────────────────────
//  BIGSTACK — Error Handler
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const scheduler = require("../core/scheduler");
const { GrammyError, HttpError } = require("grammy");

// ══════════════════════════════════════════════════
//  ERRORS TO IGNORE (not worth reporting)
// ══════════════════════════════════════════════════
function shouldSkipError(error) {
    // ─── Must be a GrammyError ──────────────────────
    if (!(error instanceof GrammyError)) return false;

    const msg = error.message || "";
    const code = error.error_code;

    // ─── User blocked bot ───────────────────────────
    if (msg.includes("bot was blocked by the user")) return true;

    // ─── Chat deleted / user deactivated ────────────
    if (msg.includes("chat not found")) return true;
    if (msg.includes("user is deactivated")) return true;
    if (msg.includes("PEER_ID_INVALID")) return true;

    // ─── Message edit failures (harmless) ───────────
    if (msg.includes("message is not modified")) return true;
    if (msg.includes("message to edit not found")) return true;
    if (msg.includes("message can't be edited")) return true;

    // ─── Callback query expired (user tapped old button)
    if (msg.includes("query is too old")) return true;
    if (msg.includes("query ID is invalid")) return true;

    // ─── Bot removed from group ─────────────────────
    if (msg.includes("bot was kicked")) return true;
    if (msg.includes("CHAT_WRITE_FORBIDDEN")) return true;

    // ─── Any 403 (forbidden) is usually benign ──────
    if (code === 403) return true;

    return false;
}

// ══════════════════════════════════════════════════
//  Deduplication ⏤ prevent spam in errors group
// ══════════════════════════════════════════════════
const recentErrors = new Map();
const DEDUP_WINDOW_MS = 60 * 1000;

function fingerprint(error) {
    const msg = (error?.message || "unknown").slice(0, 100);
    return `${error?.name || "Error"}|${msg}`;
}

function isDuplicate(error) {
    const key = fingerprint(error);
    const now = Date.now();
    const prev = recentErrors.get(key);

    if (prev && now - prev.firstSeen < DEDUP_WINDOW_MS) {
        prev.count++;
        return { duplicate: true, count: prev.count };
    }

    recentErrors.set(key, { firstSeen: now, count: 1 });

    if (recentErrors.size > 200) {
        for (const [k, v] of recentErrors.entries()) {
            if (now - v.firstSeen > DEDUP_WINDOW_MS * 2) {
                recentErrors.delete(k);
            }
        }
    }

    return { duplicate: false, count: 1 };
}

// ══════════════════════════════════════════════════
//  Friendly reply text
// ══════════════════════════════════════════════════
function friendlyMessage(error) {
    const msg = error?.message || "";

    if (msg.includes("All") && msg.includes("providers failed")) {
        return "❌ Service unavailable ⏤ try again in a moment.";
    }
    if (msg.includes("timeout") || error?.code === "ECONNABORTED") {
        return "⏳ Request timed out ⏤ try again.";
    }
    if (error?.response?.status === 429) {
        return "⏳ Slow down! Try again in a minute.";
    }
    if (error?.response?.status === 404) {
        return "❌ Not found.";
    }
    if (error?.response?.status >= 500) {
        return "🔧 Server error ⏤ try again soon.";
    }

    return config.messages?.error || "❌ Something went wrong. Try again.";
}

// ══════════════════════════════════════════════════
//  Safe reply ⏤ never throws
// ══════════════════════════════════════════════════
async function safeReply(ctx, text) {
    if (!text) return;
    try {
        await ctx.reply(text);
    } catch {
        // User blocked bot ⏤ ignore
    }
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function errorHandler(ctx, next) {
    const startTime = Date.now();

    try {
        await next();

        // Track successful command
        if (ctx.commandName) {
            scheduler.trackCommand(ctx.commandName, ctx.from?.id);
        }

    } catch (error) {
        // ─── 1. Skip benign errors ──────────────────
        if (shouldSkipError(error)) {
            logger.warn(`[errorHandler] skipped benign: ${error.message?.slice(0, 80)}`);
            return; // don't reply, don't forward
        }

        const elapsed = Date.now() - startTime;

        // ─── 2. Log locally ────────────────────────
        logger.error(`[error] ${error.message}`);
        if (error.stack) logger.debug(error.stack);

        // ─── 3. Track for stats ────────────────────
        scheduler.trackError();

        // ─── 4. Deduplicate ────────────────────────
        const dedup = isDuplicate(error);

        // ─── 5. Build context ──────────────────────
        const context = {
            command: ctx.commandName || "unknown",
            user: ctx.from
                ? `${ctx.from.first_name || ""} (@${ctx.from.username || "no-username"}) [${ctx.from.id}]`
                : "unknown",
            chatType: ctx.chat?.type || "unknown",
            input: ctx.args?.length ? ctx.args.join(" ") : "",
            provider: error.provider || null,
            metadata: {
                elapsed: `${elapsed}ms`,
                updateId: ctx.update?.update_id,
                messageId: ctx.message?.message_id
            }
        };

        // ─── 6. Send to ERRORS group ───────────────
        if (!dedup.duplicate) {
            await logger.errorToGroup(error, context).catch(() => {});
        }

        // ─── 7. Reply to user (safe) ───────────────
        const friendly = friendlyMessage(error);
        if (friendly) {
            await safeReply(ctx, friendly);
        }
    }
}

// ─── Cleanup ────────────────────────────────────────
function cleanup() {
    recentErrors.clear();
}

// ─── Export ─────────────────────────────────────────
module.exports = errorHandler;
module.exports.cleanup = cleanup;