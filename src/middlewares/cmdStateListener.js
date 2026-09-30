// ──────────────────────────────────────────────────
//  BIGSTACK — Command State Listener
//  Catches messages after /addcmd and Even
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const cache = require("../core/cache");
const logger = require("../core/logger");

const STATE_KEY = (userId) => `awaiting:addcmd:${userId}`;

async function cmdStateListener(ctx, next) {
    if (!ctx.message || !ctx.from) return next();
    if (ctx.from.is_bot) return next();

    const userId = String(ctx.from.id);

    // ─── Check if awaiting script ───────────────────
    const awaiting = await cache.get(STATE_KEY(userId));
    if (!awaiting) return next();

    const text = ctx.message.text || ctx.message.caption || "";

    if (!text) return next();

    // ─── Skip if it's a command (let it be handled) ─
    if (text.startsWith("/")) {
        return next();
    }

    // ─── Hand off to addcmd ─────────────────────────
    try {
        const addcmd = require("../commands/utility/addcmd");
        await addcmd.processState(ctx, text);
    } catch (err) {
        logger.error(`[cmdStateListener] ${err.message}`);
        await ctx.reply("✗ Failed to process script.");
    }
}

module.exports = cmdStateListener;