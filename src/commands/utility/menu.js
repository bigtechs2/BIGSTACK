// ──────────────────────────────────────────────────
//  BIGSTACK — /menu Command
//  Main navigation menu with banner
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Build menu keyboard
// ══════════════════════════════════════════════════
function buildMenuKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "◇ Downloader", callback_data: "menu:downloader" },
                { text: "◈ Search",     callback_data: "menu:search" }
            ],
            [
                { text: "◉ AI Assistant", callback_data: "menu:ai" },
                { text: "▣ Player",       callback_data: "menu:player" }
            ],
            [
                { text: "★ Profile",  callback_data: "menu:profile" },
                { text: "☆ Daily",    callback_data: "menu:daily" }
            ],
            [
                { text: "★ Store",   callback_data: "menu:store" },
                { text: "⚙ Settings", callback_data: "menu:settings" }
            ],
            [
                { text: "? Help",  callback_data: "menu:help" },
                { text: "✗ Report", callback_data: "menu:report" }
            ]
        ]
    };
}

// ─── Menu caption ───────────────────────────────────
function buildMenuCaption(user) {
    const name = user?.firstName || "friend";

    return (
        `◈ *BIGSTACK MENU*\n\n` +
        `Hello, *${name}*!\n\n` +
        `▸ Pick a category below to explore commands\n\n` +
        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "menu",
    aliases: ["nav", "home", "categories"],
    category: "utility",
    description: "Show main menu",
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
        logger.info(`[/menu] ${ctx.from.id} opened menu`);

        const caption = buildMenuCaption(ctx.user);
        const keyboard = buildMenuKeyboard();
        const bannerUrl = config.branding?.banner;

        // ─── Send with banner if available ──────────
        if (bannerUrl && bannerUrl.startsWith("http")) {
            try {
                return await ctx.replyWithPhoto(bannerUrl, {
                    caption,
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            } catch (err) {
                logger.warn(`[/menu] banner failed: ${err.message}`);
                // Fall through to text
            }
        }

        // ─── Fallback: plain text ───────────────────
        await ctx.reply(caption, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    }
};