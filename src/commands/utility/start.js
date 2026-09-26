// ──────────────────────────────────────────────────
//  BIGSTACK — /start Command
//  Welcome + main menu
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
        const user = ctx.user;
        const name = ctx.from.first_name || "friend";

        // ─── Starter bonus on first /start ────────
        if (user && user.totalCommands === 0) {
            const bonus = config.rewards?.start?.coins || 20;
            if (bonus > 0) {
                user.coins = (user.coins || 0) + bonus;
                user.totalEarned = (user.totalEarned || 0) + bonus;
                await user.save().catch(() => {});

                logger.info(`[/start] ${ctx.from.id} claimed starter bonus: ${bonus}`);
            }
        }

        // ─── Send welcome ─────────────────────────
        await ctx.reply(buildWelcome(name), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard()
        });
    }
};