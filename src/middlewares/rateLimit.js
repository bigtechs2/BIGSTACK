// ──────────────────────────────────────────────────
//  BIGSTACK — Rate Limit Middleware
//  Prevents users from spamming commands
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const cache = require("../core/cache");

// ─── Limits ─────────────────────────────────────────
const LIMITS = {
    command:  { max: 15, window: 60 },      // 15 commands / min
    ai:       { max: 30, window: 60 },      // 30 AI messages / min
    download: { max: 8,  window: 60 }       // 8 downloads / min
};

// ─── Commands exempt from rate limit ────────────────
const EXEMPT = ["start", "help", "menu", "daily", "balance", "profile"];

// ══════════════════════════════════════════════════
//  Check + increment
// ══════════════════════════════════════════════════
async function checkLimit(key, userId, limits) {
    const now = Date.now();
    const bucketKey = `rl:${key}:${userId}`;

    let data = await cache.get(bucketKey);

    if (!data || now - data.start > limits.window * 1000) {
        // New window
        data = { start: now, count: 1 };
    } else {
        data.count++;
    }

    await cache.set(bucketKey, data, limits.window);

    return {
        ok: data.count <= limits.max,
        count: data.count,
        remaining: Math.max(0, limits.max - data.count),
        resetIn: Math.ceil((data.start + limits.window * 1000 - now) / 1000)
    };
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function rateLimit(ctx, next) {
    // ─── Skip if no user ─────────────────────────────
    if (!ctx.from || ctx.from.is_bot) return next();

    // ─── Skip owner ──────────────────────────────────
    if (config.isOwner(ctx.from.id)) return next();

    const userId = String(ctx.from.id);

    // ─── Check AI messages ───────────────────────────
    if (ctx.aiText) {
        const aiCheck = await checkLimit("ai", userId, LIMITS.ai);
        if (!aiCheck.ok) {
            logger.warn(`[rateLimit] ${userId} hit AI limit`);

            return ctx.reply(
                `◐ *Slow down*\n\n` +
                `▸ You are sending AI messages too fast.\n` +
                `▸ Wait *${aiCheck.resetIn}s* and try again.`,
                { parse_mode: "Markdown" }
            );
        }
        return next();
    }

    // ─── Check commands ──────────────────────────────
    if (!ctx.commandName) return next();
    if (EXEMPT.includes(ctx.commandName)) return next();

    // ─── Downloader commands ⏤ tighter limit ─────────
    const isDownloader = ctx.commandCategory === "downloader";
    const limits = isDownloader ? LIMITS.download : LIMITS.command;
    const key = isDownloader ? "download" : "command";

    const check = await checkLimit(key, userId, limits);

    if (!check.ok) {
        logger.warn(`[rateLimit] ${userId} hit ${key} limit (${check.count})`);

        return ctx.reply(
            `◐ *Too Fast*\n\n` +
            `▸ You are sending commands too quickly.\n` +
            `▸ Wait *${check.resetIn}s* and try again.\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    }

    return next();
}

module.exports = rateLimit;