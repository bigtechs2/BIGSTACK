// ──────────────────────────────────────────────────
//  BIGSTACK — Coin Guard Middleware
//  Deducts coins before running commands
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const User = require("../database/models/User");

// ─── Commands that never cost coins ─────────────────
const FREE_COMMANDS = [
    "start",
    "help",
    "menu",
    "about",
    "verify",
    "lang",
    "daily",
    "balance",
    "profile",
    "refer",
    "settings",
    "store",
    "ai"
];

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function coinGuard(ctx, next) {
    // ─── Skip if no command ──────────────────────────
    if (!ctx.commandName) return next();

    // ─── Skip if free command ────────────────────────
    if (FREE_COMMANDS.includes(ctx.commandName)) return next();

    // ─── Skip if owner ───────────────────────────────
    if (config.isOwner(ctx.from.id)) return next();

    // ─── Get command permissions ─────────────────────
    const perms = ctx.commandPermissions || {};
    const cost = perms.coin ?? config.getCoinCost(ctx.commandName) ?? 0;

    // ─── Skip if free ────────────────────────────────
    if (cost <= 0) return next();

    // ─── Fetch user ──────────────────────────────────
    let user = ctx.user;

    if (!user) {
        try {
            user = await User.findOne({ telegramId: String(ctx.from.id) });
            ctx.user = user;
        } catch {
            return next(); // Fail-safe ⏤ let the command run
        }
    }

    if (!user) return next();

    // ─── Check premium bypass ────────────────────────
    const premiumActive =
        user.premium && user.premiumExpiry && user.premiumExpiry > new Date();

    if (premiumActive) {
        logger.debug(`[coinGuard] ${ctx.from.id} premium ⏤ no charge`);
        ctx.coinCharged = 0;
        return next();
    }

    // ─── Check balance ───────────────────────────────
    if (user.coins < cost) {
        return ctx.reply(
            `◐ *Not Enough Coins*\n\n` +
            `▸ Required  ➤ ${cost} 🪙\n` +
            `▸ Balance   ➤ ${user.coins} 🪙\n` +
            `▸ Short by  ➤ ${cost - user.coins} 🪙\n\n` +
            `▸ Get coins\n` +
            `   ➤ /daily ⏤ claim free coins\n` +
            `   ➤ /refer ⏤ invite friends\n` +
            `   ➤ /store ⏤ buy coins\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    }

    // ─── Deduct coins ────────────────────────────────
    user.deductCoins(cost);
    await user.save().catch((err) => {
        logger.warn(`[coinGuard] save failed: ${err.message}`);
    });

    ctx.coinCharged = cost;
    logger.info(`[coinGuard] ${ctx.from.id} charged ${cost} for /${ctx.commandName}`);

    return next();
}

module.exports = coinGuard;