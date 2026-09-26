// ──────────────────────────────────────────────────
//  BIGSTACK — /profile Command
//  User profile + stats
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

// ══════════════════════════════════════════════════
//  Format helpers
// ══════════════════════════════════════════════════
function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function buildProfile(user) {
    const premiumActive =
        user.premium && user.premiumExpiry && user.premiumExpiry > new Date();

    const premiumLine = premiumActive
        ? `★ ACTIVE (${user.premiumDaysLeft} days left)`
        : "○ INACTIVE";

    const name = user.firstName || "Unknown";
    const username = user.username ? `@${user.username}` : "no username";

    return (
        `◈ *YOUR PROFILE*\n\n` +

        `◉ *Account*\n` +
        `   ➤ Name      ➤ ${name}\n` +
        `   ➤ Username  ➤ ${username}\n` +
        `   ➤ ID        ➤ \`${user.telegramId}\`\n` +
        `   ➤ Joined    ➤ ${formatDate(user.createdAt || user.firstSeen)}\n\n` +

        `🪙 *Wallet*\n` +
        `   ➤ Coins       ➤ ${user.coins}\n` +
        `   ➤ Earned      ➤ ${user.totalEarned}\n` +
        `   ➤ Spent       ➤ ${user.totalSpent}\n\n` +

        `◈ *Premium*\n` +
        `   ➤ Status    ➤ ${premiumLine}\n\n` +

        `▣ *Activity*\n` +
        `   ➤ Commands    ➤ ${user.totalCommands || 0}\n` +
        `   ➤ Downloads   ➤ ${user.totalDownloads || 0}\n` +
        `   ➤ Daily Claims ➤ ${user.totalClaims || 0}\n` +
        `   ➤ Streak      ➤ ${user.streakDays || 0} days\n\n` +

        `☆ *Referrals*\n` +
        `   ➤ Invited     ➤ ${user.referralCount || 0}\n` +
        `   ➤ Earned      ➤ ${user.referralEarnings || 0}\n\n` +

        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "profile",
    aliases: ["me", "account", "stats"],
    category: "utility",
    description: "View your profile and stats",
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

        let user = ctx.user || (await User.findOne({ telegramId }));
        if (!user) {
            user = await User.create({
                telegramId,
                firstName: ctx.from.first_name || null
            });
            user.generateReferralCode();
            await user.save().catch(() => {});
        }

        logger.info(`[/profile] ${telegramId} viewed profile`);

        await ctx.reply(buildProfile(user), {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "☆ Refer", callback_data: "profile:refer" },
                        { text: "◈ Balance", callback_data: "profile:balance" }
                    ],
                    [
                        { text: "★ Store", callback_data: "menu:store" },
                        { text: "⚙ Settings", callback_data: "menu:settings" }
                    ]
                ]
            }
        });
    }
};