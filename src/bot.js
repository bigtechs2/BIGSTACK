// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Instance
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { Bot } = require("grammy");
const { hydrateReply, parseMode } = require("@grammyjs/parse-mode");
const { autoRetry } = require("@grammyjs/auto-retry");
const { stream } = require("@grammyjs/stream");

const config = require("./config");
const logger = require("./core/logger");
const errorForwarder = require("./core/errorForwarder");

// ══════════════════════════════════════════════════
//  CREATE BOT INSTANCE
// ══════════════════════════════════════════════════

const bot = new Bot(process.env.BOT_TOKEN, {
    client: {
        timeoutSeconds: 60
    }
});

// ─── Attach config to bot ───────────────────────────
bot.config = config;

// ══════════════════════════════════════════════════
//  RICH MESSAGE PLUGINS
// ══════════════════════════════════════════════════

// ─── 1. Auto-retry (needed by stream) ───────────────
// Handles Telegram rate limits automatically
bot.api.config.use(autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 5
}));

// ─── 2. Parse mode — enables ctx.replyWithHTML, etc. ─
bot.use(hydrateReply);

// ─── 3. Stream — live typing updates ────────────────
bot.use(stream());

// ══════════════════════════════════════════════════
//  ATTACH BOT TO LOGGER
//  Now logger can send messages to your 3 groups
// ══════════════════════════════════════════════════

logger.attachBot(bot);

// ══════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
//  Catches errors that escape middleware + command
//  Forwards full error to ERRORS group
// ══════════════════════════════════════════════════

bot.catch(async (err) => {
    const ctx = err.ctx;
    const error = err.error;

    // ─── 1. Log locally ─────────────────────────────
    logger.error(`[bot.catch] update ${ctx?.update?.update_id}: ${error?.message || error}`);

    // ─── 2. Forward to ERRORS group ─────────────────
    try {
        await errorForwarder.forwardGlobalError(error, ctx);
    } catch (e) {
        logger.warn(`[bot.catch] forwarding failed: ${e.message}`);
    }

    // ─── 3. Reply to user (avoid double-reply) ──────
    try {
        if (ctx && typeof ctx.reply === "function") {
            if (!ctx.__errorReplied) {
                await ctx.reply(
                    config.messages?.error ||
                        "✗  Something went wrong. Please try again later."
                );
                ctx.__errorReplied = true;
            }
        }
    } catch {
        // User may have blocked the bot — ignore
    }
});

// ══════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════

module.exports = bot;