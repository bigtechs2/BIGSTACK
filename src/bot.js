// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Instance
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { Bot } = require("grammy");
const config = require("./config");
const logger = require("./core/logger");
const errorForwarder = require("./core/errorForwarder");

// ══════════════════════════════════════════════════
//  🤖 CREATE BOT INSTANCE
// ══════════════════════════════════════════════════

const bot = new Bot(process.env.BOT_TOKEN, {
    client: {
        timeoutSeconds: 60
    }
});

// ─── Attach config to bot for easy access ───────────
bot.config = config;

// ══════════════════════════════════════════════════
//  🔗 ATTACH BOT TO LOGGER
//  Now logger can send messages to your 3 groups
// ══════════════════════════════════════════════════

logger.attachBot(bot);

// ══════════════════════════════════════════════════
//  🚨 GLOBAL ERROR HANDLER
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
        // If forwarding fails, log locally (don't recurse)
        logger.warn(`[bot.catch] forwarding failed: ${e.message}`);
    }

    // ─── 3. Try to reply to user ────────────────────
    try {
        if (ctx && typeof ctx.reply === "function") {
            // Avoid double-reply if errorHandler already replied
            if (!ctx.__errorReplied) {
                await ctx.reply(config.messages?.error || "❌ Something went wrong. Please try again later.");
                ctx.__errorReplied = true;
            }
        }
    } catch {
        // User may have blocked the bot — ignore
    }
});

// ══════════════════════════════════════════════════
//  🧹 EXPORT
// ══════════════════════════════════════════════════

module.exports = bot;