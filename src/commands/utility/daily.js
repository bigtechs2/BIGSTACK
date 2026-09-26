// ──────────────────────────────────────────────────
//  BIGSTACK — /daily Command
//  Claim daily reward + streak
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");
const { formatDuration } = require("../../utils/time");

// ─── Streak rewards ─────────────────────────────────
const STREAK_REWARDS = {
    1: 50,
    2: 55,
    3: 60,
    4: 70,
    5: 80,
    6: 90,
    7: 100
};

const MAX_STREAK = 7;

function getStreakReward(day) {
    if (day <= 0) return STREAK_REWARDS[1];
    if (day > MAX_STREAK) return STREAK_REWARDS[MAX_STREAK];
    return STREAK_REWARDS[day] || STREAK_REWARDS[1];
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "daily",
    aliases: ["claim", "reward"],
    category: "utility",
    description: "Claim your daily coin reward",
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
            user = await User.create({ telegramId, firstName: ctx.from.first_name });
        }

        // ─── Check cooldown ──────────────────────
        const check = user.canClaimDaily(24 * 60 * 60 * 1000);

        if (!check.ok) {
            return ctx.reply(
                `◐ *Already Claimed*\n\n` +
                `▸ Come back in *${formatDuration(check.remaining)}*\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Calculate reward ────────────────────
        const premiumActive =
            user.premium && user.premiumExpiry && user.premiumExpiry > new Date();

        // Next streak day
        const nextStreak = (user.streakDays || 0) + 1;
        const baseReward = getStreakReward(nextStreak);
        const reward = premiumActive ? baseReward * 3 : baseReward;

        // ─── Claim ──────────────────────────────
        user.claimDaily(reward);
        await user.save();

        logger.info(
            `[/daily] ${telegramId} claimed ${reward} coins (streak: ${user.streakDays})`
        );

        // ─── Build response ──────────────────────
        const streakLine =
            user.streakDays >= MAX_STREAK
                ? `▸ Streak    ➤ ${user.streakDays} days ★ MAX`
                : `▸ Streak    ➤ ${user.streakDays} / ${MAX_STREAK} days`;

        const text =
            `◈ *DAILY REWARD CLAIMED*\n\n` +
            `▸ Reward    ➤ +${reward} 🪙\n` +
            `▸ Balance   ➤ ${user.coins} 🪙\n` +
            streakLine +
            (premiumActive ? `\n▸ Bonus     ➤ ★ Premium ×3` : "") +
            `\n\n` +
            `▸ Next claim in 24 hours\n\n` +
            `▸ ${config.footer}`;

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};