// ──────────────────────────────────────────────────
//  BIGSTACK — /refer Command
//  Get referral link + stats
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

// ─── Rewards from config ────────────────────────────
const REFERRER_BONUS = config.rewards?.referral?.referrerBonus || 25;
const REFEREE_BONUS = config.rewards?.referral?.refereeBonus || 10;

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "refer",
    aliases: ["invite", "ref"],
    category: "utility",
    description: "Invite friends and earn coins",
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

        // ─── Ensure referral code exists ─────────
        if (!user.referralCode) {
            user.generateReferralCode();
            await user.save();
        }

        // ─── Build invite link ───────────────────
        const botUsername = config.botUsername || "BigStackBot";
        const link = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

        const text =
            `◈ *INVITE FRIENDS*\n\n` +
            `▸ Share your link and earn coins!\n\n` +
            `*Rewards*\n` +
            `   ➤ You get       ➤ +${REFERRER_BONUS} 🪙\n` +
            `   ➤ Friend gets   ➤ +${REFEREE_BONUS} 🪙\n\n` +
            `*Your Stats*\n` +
            `   ➤ Invited        ➤ ${user.referralCount || 0}\n` +
            `   ➤ Total Earned   ➤ ${user.referralEarnings || 0} 🪙\n\n` +
            `*Your Invite Link*\n` +
            `   \`${link}\`\n\n` +
            `▸ Share this link on WhatsApp,\n` +
            `   Facebook, or anywhere.\n\n` +
            `▸ ${config.footer}`;

        logger.info(`[/refer] ${telegramId} viewed invite link`);

        await ctx.reply(text, {
            parse_mode: "Markdown",
            disable_web_page_preview: true
        });
    }
};