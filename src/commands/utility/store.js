// ──────────────────────────────────────────────────
//  BIGSTACK — /store Command
//  Buy coins or premium
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Store layout ⏤ all under 1000 Stars
// ══════════════════════════════════════════════════
const COIN_PACKAGES = [
    { id: "coins_100",  coins: 100,  stars: 30,   label: "100 Coins" },
    { id: "coins_500",  coins: 500,  stars: 140,  label: "500 Coins" },
    { id: "coins_1000", coins: 1000, stars: 260,  label: "1000 Coins" },
    { id: "coins_5000", coins: 5000, stars: 1000, label: "5000 Coins" }
];

const PREMIUM_PLANS = [
    { id: "premium_weekly",  label: "Weekly",  stars: 150,  days: 7 },
    { id: "premium_monthly", label: "Monthly", stars: 450,  days: 30 },
    { id: "premium_yearly",  label: "Yearly",  stars: 1000, days: 365 }
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
        `   ➤ 5000 Coins    ➤ 1000 ⭐\n\n` +

        `★ *Premium Plans*\n` +
        `   ➤ Weekly        ➤ 150 ⭐\n` +
        `   ➤ Monthly       ➤ 450 ⭐\n` +
        `   ➤ Yearly        ➤ 1000 ⭐\n\n` +

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
                { text: "5000 Coins · 1000 ⭐", callback_data: "store:coins_5000" }
            ],
            [
                { text: "★ Weekly · 150 ⭐", callback_data: "store:premium_weekly" }
            ],
            [
                { text: "★ Monthly · 450 ⭐", callback_data: "store:premium_monthly" }
            ],
            [
                { text: "★ Yearly · 1000 ⭐", callback_data: "store:premium_yearly" }
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
    aliases: ["shop", "topup"],
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
        // ─── User picked a package ────────────────
        {
            pattern: /^store:(coins|premium)_(.+)$/,
            handler: async (ctx) => {
                const type = ctx.match[1];
                const id = ctx.match[2];
                const fullId = `${type}_${id}`;

                const starsService = require("../../services/payment/stars.service");
                const pkg =
                    starsService.COIN_PACKAGES[fullId] ||
                    starsService.PREMIUM_PLANS[fullId];

                if (!pkg) {
                    return ctx.answerCallbackQuery({
                        text: "Unknown package",
                        show_alert: true
                    });
                }

                await ctx.answerCallbackQuery();

                const lines = [
                    `◈ *${pkg.label}*\n`,
                    `▸ Price via Stars   ➤ ${pkg.stars} ⭐`
                ];

                if (pkg.coins) lines.push(`▸ Coins            ➤ ${pkg.coins}`);
                if (pkg.days) lines.push(`▸ Duration         ➤ ${pkg.days} days`);

                lines.push("");
                lines.push(`▸ Choose payment method:`);

                try {
                    await ctx.editMessageText(lines.join("\n"), {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: `⭐ Pay with Stars (${pkg.stars})`,
                                        callback_data: `store:stars:${fullId}`
                                    }
                                ],
                                [
                                    {
                                        text: "◈ Mobile Money (Manual)",
                                        callback_data: `buy:item:${fullId}`
                                    }
                                ],
                                [
                                    { text: "◀ Back", callback_data: "menu:store" }
                                ]
                            ]
                        }
                    });
                } catch (err) {
                    logger.warn(`[/store] edit failed: ${err.message}`);
                }
            }
        },

        // ─── User picked "Pay with Stars" ─────────
        {
            pattern: /^store:stars:(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const starsService = require("../../services/payment/stars.service");

                await ctx.answerCallbackQuery();

                try {
                    await starsService.sendInvoice(ctx, itemId);
                } catch (err) {
                    logger.error(`[stars] invoice failed: ${err.message}`);
                    await ctx.reply(`✗  Could not create invoice: ${err.message}`);
                }
            }
        }
    ]
};

// ─── Export packages ────────────────────────────────
module.exports.COIN_PACKAGES = COIN_PACKAGES;
module.exports.PREMIUM_PLANS = PREMIUM_PLANS;