// ──────────────────────────────────────────────────
//  BIGSTACK — /menu Command
//  Main navigation menu
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {
    name: "menu",
    aliases: ["nav", "home"],
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
        await ctx.reply(
            `◈ *BIGSTACK MENU*\n\n` +
            `▸ Pick a category below`,
            {
                parse_mode: "Markdown",
                reply_markup: {
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
                }
            }
        );
    }
};