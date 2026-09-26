// ──────────────────────────────────────────────────
//  BIGSTACK — /start Command
//  Welcome + main menu + referral handling
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

// ══════════════════════════════════════════════════
//  Build the welcome screen
// ══════════════════════════════════════════════════
function buildWelcome(name) {
    return (
        `◈ *WELCOME TO BIGSTACK* ◈\n\n` +
        `Hello, *${name}*!\n\n` +
        `I am your all-in-one media assistant.\n\n` +
        `▸ Download from 16 platforms\n` +
        `▸ Search music, movies, images\n` +
        `▸ AI assistant with chat + vision\n` +
        `▸ Earn coins daily, unlock premium\n\n` +
        `▸ Choose an option below to begin`
    );
}

// ══════════════════════════════════════════════════
//  Build the main menu keyboard
// ══════════════════════════════════════════════════
function buildKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "◇ Downloader", callback_data: "menu:downloader" },
                { text: "◈ Search", callback_data: "menu:search" }
            ],
            [
                { text: "◉ AI Assistant", callback_data: "menu:ai" },
                { text: "▣ Player", callback_data: "menu:player" }
            ],
            [
                { text: "★ Profile", callback_data: "menu:profile" },
                { text: "☆ Daily Coins", callback_data: "menu:daily" }
            ],
            [
                { text: "⚙ Settings", callback_data: "menu:settings" },
                { text: "? Help", callback_data: "menu:help" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "start",
    aliases: ["hello", "hi"],
    category: "utility",
    description: "Welcome message and main menu",
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
        const name = ctx.from.first_name || "friend";
        const args = ctx.args || [];

        // ─── Fetch user (fallback if middleware missed) ───
        let user = ctx.user || (await User.findOne({ telegramId }));
        if (!user) {
            user = await User.create({
                telegramId,
                firstName: ctx.from.first_name || null,
                username: ctx.from.username || null
            });
            user.generateReferralCode();
            await user.save().catch(() => {});
        }

        // ══════════════════════════════════════════
        //  HANDLE REFERRAL LINK (ref_XXXXXX)
        // ══════════════════════════════════════════
        const isNewUser = user.totalCommands === 0;

        if (args[0] && String(args[0]).startsWith("ref_") && isNewUser && !user.referrerId) {
            const refCode = String(args[0]).replace("ref_", "");

            try {
                const referrer = await User.findOne({ referralCode: refCode });

                if (referrer && referrer.telegramId !== telegramId) {
                    const referrerBonus = config.rewards?.referral?.referrerBonus || 25;
                    const refereeBonus = config.rewards?.referral?.refereeBonus || 10;

                    // ─── Credit referrer ────────────
                    referrer.addCoins(referrerBonus);
                    referrer.referralCount = (referrer.referralCount || 0) + 1;
                    referrer.referralEarnings =
                        (referrer.referralEarnings || 0) + referrerBonus;
                    await referrer.save().catch(() => {});

                    // ─── Credit referee ─────────────
                    user.applyReferral(referrer.telegramId, refereeBonus);
                    await user.save().catch(() => {});

                    logger.info(
                        `[/start] ${telegramId} referred by ${referrer.telegramId} (+${refereeBonus} to user, +${referrerBonus} to referrer)`
                    );

                    // ─── Notify referrer ────────────
                    try {
                        await ctx.api.sendMessage(
                            referrer.telegramId,
                            `◈ *New Referral*\n\n` +
                            `▸ *${name}* joined using your link\n` +
                            `▸ You earned ➤ +${referrerBonus} 🪙\n` +
                            `▸ Total referrals ➤ ${referrer.referralCount}`,
                            { parse_mode: "Markdown" }
                        );
                    } catch {
                        // Referrer might have blocked the bot
                    }
                }
            } catch (err) {
                logger.warn(`[/start] referral credit failed: ${err.message}`);
            }
        }

        // ══════════════════════════════════════════
        //  STARTER BONUS (first /start only)
        // ══════════════════════════════════════════
        if (isNewUser) {
            const bonus = config.rewards?.start?.coins || 20;
            if (bonus > 0) {
                user.addCoins(bonus);
                await user.save().catch(() => {});

                logger.info(`[/start] ${telegramId} claimed starter bonus: ${bonus}`);
            }
        }

        // ══════════════════════════════════════════
        //  SEND WELCOME
        // ══════════════════════════════════════════
        await ctx.reply(buildWelcome(name), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard()
        });
    }
};