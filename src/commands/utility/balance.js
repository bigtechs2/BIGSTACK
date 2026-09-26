// ──────────────────────────────────────────────────
//  BIGSTACK — /balance Command
//  Show coin balance
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

module.exports = {
    name: "balance",
    aliases: ["bal", "coins", "wallet"],
    category: "utility",
    description: "Show your coin balance",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const telegramId = String(ctx.from.id);

        // ─── Fetch user ──────────────────────────
        let user = ctx.user || (await User.findOne({ telegramId }));
        if (!user) {
            // Auto-create if somehow missing
            user = await User.create({ telegramId, firstName: ctx.from.first_name });
        }

        // ─── Premium status ──────────────────────
        const premiumActive =
            user.premium && user.premiumExpiry && user.premiumExpiry > new Date();
        const premiumLabel = premiumActive ? "★ ACTIVE" : "○ INACTIVE";

        const text =
            `◈ *YOUR WALLET*\n\n` +
            `▸ Coins      ➤ ${user.coins} 🪙\n` +
            `▸ Total Earned ➤ ${user.totalEarned}\n` +
            `▸ Total Spent  ➤ ${user.totalSpent}\n\n` +
            `◈ *Premium*\n` +
            `   ➤ Status   ➤ ${premiumLabel}` +
            (premiumActive ? `\n   ➤ Expires  ➤ ${user.premiumExpiry.toLocaleDateString("en-GB")}` : "") +
            `\n\n` +
            `▸ ${config.footer}`;

        logger.info(`[/balance] ${telegramId} → ${user.coins} coins`);

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};