//  BIGSTACK — /stats Command
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../../src/config");
const logger = require("../../../src/core/logger");
const User = require("../../../src/database/models/User");
const CommandStat = require("../../../src/database/models/CommandStat");
const AIMemory = require("../../../src/database/models/AIMemory");

module.exports = {
    name: "stats",
    aliases: ["statistics", "botstats"],
    category: "utility",
    description: "Bot statistics (admin)",
    emoji: "◈",
    usage: "[no arguments]",
    permissions: { coin: 0, owner: false, admin: true, premium: false, group: false, private: true },

    code: async (ctx) => {
        try {
            const totalUsers = await User.countDocuments({ banned: false });
            const premiumUsers = await User.countDocuments({ premium: true, premiumExpiry: { $gt: new Date() } });
            const bannedUsers = await User.countDocuments({ banned: true });
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const activeToday = await User.countDocuments({ lastSeen: { $gte: since24h } });
            const totalCommands = await CommandStat.countDocuments();
            const totalAIMessages = await AIMemory.countDocuments();
            const topCommands = await CommandStat.getTopCommands(24, 5);

            const coinAgg = await User.aggregate([{ $group: { _id: null, total: { $sum: "$coins" } } }]);
            const totalCoins = coinAgg[0]?.total || 0;

            let text = `◈ *BOT STATISTICS*\n\n`;
            text += `◈ *Users*\n`;
            text += `   ➤ Total       ➤ ${totalUsers}\n`;
            text += `   ➤ Premium     ➤ ${premiumUsers}\n`;
            text += `   ➤ Banned      ➤ ${bannedUsers}\n`;
            text += `   ➤ Active 24h  ➤ ${activeToday}\n\n`;
            text += `◈ *Activity*\n`;
            text += `   ➤ Commands    ➤ ${totalCommands}\n`;
            text += `   ➤ AI messages ➤ ${totalAIMessages}\n\n`;
            text += `◈ *Economy*\n`;
            text += `   ➤ Coins in circulation ➤ ${totalCoins}\n\n`;

            if (topCommands.length > 0) {
                text += `◈ *Top Commands (24h)*\n`;
                topCommands.forEach((c, i) => {
                    text += `   ${i + 1}. /${c.name} ➤ ${c.count}\n`;
                });
                text += `\n`;
            }
            text += `▸ ${config.footer}`;

            await ctx.reply(text, { parse_mode: "Markdown" });
        } catch (err) {
            logger.error(`[/stats] ${err.message}`);
            await ctx.reply(`✗ Failed to load stats: ${err.message}`);
        }
    }
};
