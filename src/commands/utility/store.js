// ──────────────────────────────────────────────────
//  BIGSTACK — /store Command
//  Buy coins or premium
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Store layout
// ══════════════════════════════════════════════════
const COIN_PACKAGES = [
    { id: "coins_100",  coins: 100,  stars: 30,  label: "100 Coins" },
    { id: "coins_500",  coins: 500,  stars: 140, label: "500 Coins" },
    { id: "coins_1000", coins: 1000, stars: 260, label: "1000 Coins" },
    { id: "coins_5000", coins: 5000, stars: 1100, label: "5000 Coins" }
];

const PREMIUM_PLANS = [
    { id: "premium_weekly",  label: "Weekly",  stars: 150,  days: 7 },
    { id: "premium_monthly", label: "Monthly", stars: 500,  days: 30 },
    { id: "premium_yearly",  label: "Yearly",  stars: 4500, days: 365 }
];

// ══════════════════════════════════════════════════
//  Build store screen
// ══════════════════════════════════════════════════
function buildStore(balance, premiumActive) {
    return (
        `◈ *BIGSTACK STORE*\n\n` +
        `▸ Balance   ➤ ${balance} 🪙\n` +
        `▸ Premium   ➤ ${premiumActive ? "★ ACTIVE" : "○ INACTIVE"}\n\n` +

        `◈ *Coin Packages*\n` +
        `   ➤ 100 Coins     ➤ 30 ⭐\n` +
        `   ➤ 500 Coins     ➤ 140 ⭐\n` +
        `   ➤ 1000 Coins    ➤ 260 ⭐\n` +
        `   ➤ 5000 Coins    ➤ 1100 ⭐\n\n` +

        `★ *Premium Plans*\n` +
        `   ➤ Weekly        ➤ 150 ⭐\n` +
        `   ➤ Monthly       ➤ 500 ⭐\n` +
        `   ➤ Yearly        ➤ 4500 ⭐\n\n` +

        `▸ Premium = unlimited AI, no coin costs,\n` +
        `   priority downloads, ×3 daily coins.\n\n` +

        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Build store keyboard
// ══════════════════════════════════════════════════
function buildStoreKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "100 Coins · 30 ⭐", callback_data: "store:coins_100" },
                { text: "500 Coins · 140 ⭐", callback_data: "store:coins_500" }
            ],
            [
                { text: "1000 Coins · 260 ⭐", callback_data: "store:coins_1000" },
                { text: "5000 Coins · 1100 ⭐", callback_data: "store:coins_5000" }
            ],
            [
                { text: "★ Weekly Premium · 150 ⭐", callback_data: "store:premium_weekly" }
            ],
            [
                { text: "★ Monthly Premium · 500 ⭐", callback_data: "store:premium_monthly" }
            ],
            [
                { text: "★ Yearly Premium · 4500 ⭐", callback_data: "store:premium_yearly" }
            ],
            [
                { text: "◀ Back", callback_data: "menu:home" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "store",
    aliases: ["shop", "buy", "premium"],
    category: "utility",
    description: "Buy coins or premium",
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
        const balance = user?.coins || 0;
        const premiumActive =
            user?.premium && user?.premiumExpiry && user.premiumExpiry > new Date();

        logger.info(`[/store] ${ctx.from.id} opened store`);

        await ctx.reply(buildStore(balance, premiumActive), {
            parse_mode: "Markdown",
            reply_markup: buildStoreKeyboard()
        });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        {
            pattern: /^store:(coins|premium)_(.+)$/,
            handler: async (ctx) => {
                const type = ctx.match[1];
                const id = ctx.match[2];

                await ctx.answerCallbackQuery({
                    text: "⏳ Payment setup coming soon",
                    show_alert: true
                });

                // Send a placeholder message
                await ctx.reply(
                    `◈ *Payment Setup*\n\n` +
                    `▸ Item    ➤ ${type === "coins" ? `${id} coins` : `${id} premium`}\n` +
                    `▸ Status  ➤ Coming soon\n\n` +
                    `▸ Contact @${config.owner?.username || "owner"} to buy now\n` +
                    `▸ Or use /buy for manual payment`,
                    { parse_mode: "Markdown" }
                );
            }
        }
    ]
};

// ─── Export packages for use by /buy ────────────────
module.exports.COIN_PACKAGES = COIN_PACKAGES;
module.exports.PREMIUM_PLANS = PREMIUM_PLANS;