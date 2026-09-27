// ──────────────────────────────────────────────────
//  BIGSTACK — /buy Command
//  Mobile money payments (USSD Push + Manual)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const manual = require("../../services/payment/manual.service");

// ══════════════════════════════════════════════════
//  Item selection
// ══════════════════════════════════════════════════
function buildItemScreen() {
    return (
        `◈ *BUY COINS / PREMIUM*\n\n` +
        `▸ Choose what to buy:\n\n` +
        `◈ *Coins*\n` +
        `   ➤ 100 Coins   ➤ 500 TSh\n` +
        `   ➤ 220 Coins   ➤ 1,000 TSh\n` +
        `   ➤ 350 Coins   ➤ 1,500 TSh\n` +
        `   ➤ 600 Coins   ➤ 2,500 TSh\n` +
        `   ➤ 1000 Coins  ➤ 3,500 TSh\n\n` +
        `★ *Premium*\n` +
        `   ➤ Weekly      ➤ 500 TSh\n` +
        `   ➤ Monthly     ➤ 1,500 TSh\n` +
        `   ➤ Yearly      ➤ 3,500 TSh\n\n` +
        `▸ ${config.footer}`
    );
}

function buildItemKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "100 Coins · 500 TSh", callback_data: "buy:item:coins_100" },
                { text: "220 Coins · 1K TSh", callback_data: "buy:item:coins_220" }
            ],
            [
                { text: "350 Coins · 1.5K TSh", callback_data: "buy:item:coins_350" },
                { text: "600 Coins · 2.5K TSh", callback_data: "buy:item:coins_600" }
            ],
            [
                { text: "1000 Coins · 3.5K TSh", callback_data: "buy:item:coins_1000" }
            ],
            [
                { text: "★ Weekly · 500 TSh", callback_data: "buy:item:premium_weekly" }
            ],
            [
                { text: "★ Monthly · 1.5K TSh", callback_data: "buy:item:premium_monthly" }
            ],
            [
                { text: "★ Yearly · 3.5K TSh", callback_data: "buy:item:premium_yearly" }
            ],
            [
                { text: "◀ Back", callback_data: "menu:home" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Method selection
// ══════════════════════════════════════════════════
function buildMethodScreen(itemId) {
    const item = manual.PRICES[itemId];
    if (!item) return "Unknown item";

    return (
        `◈ *SELECT PAYMENT METHOD*\n\n` +
        `▸ Item   ➤ ${item.label}\n` +
        `▸ Price  ➤ ${item.tsh}\n\n` +
        `▸ Choose how you want to pay:`
    );
}

function buildMethodKeyboard(itemId) {
    return {
        inline_keyboard: [
            [
                { text: "⚡ Instant USSD Push", callback_data: `buy:push:${itemId}` }
            ],
            [
                { text: "◈ Manual M-Pesa", callback_data: `buy:method:${itemId}:mpesa` }
            ],
            [
                { text: "◉ Manual Tigo Pesa", callback_data: `buy:method:${itemId}:tigopesa` }
            ],
            [
                { text: "▣ Manual Airtel Money", callback_data: `buy:method:${itemId}:airtel` }
            ],
            [
                { text: "◀ Back", callback_data: "buy:back" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Manual instructions
// ══════════════════════════════════════════════════
function buildManualInstructions(itemId, methodKey) {
    const item = manual.PRICES[itemId];
    const method = manual.METHODS[methodKey];

    if (!item || !method) return "Unknown";

    return (
        `◈ *MANUAL PAYMENT*\n\n` +
        `▸ Item     ➤ ${item.label}\n` +
        `▸ Amount   ➤ ${item.tsh}\n` +
        `▸ Method   ➤ ${method.name}\n\n` +
        `◈ *Send payment to:*\n` +
        `   \`${method.number}\`\n\n` +
        `▸ Steps\n` +
        `   1. Send ${item.tsh} to the number above\n` +
        `   2. Take screenshot of confirmation\n` +
        `   3. Send it here\n` +
        `   4. Wait for approval\n\n` +
        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "buy",
    aliases: ["purchase", "topup"],
    category: "utility",
    description: "Buy coins or premium",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        await ctx.reply(buildItemScreen(), {
            parse_mode: "Markdown",
            reply_markup: buildItemKeyboard()
        });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        // ─── Item selected ────────────────────────
        {
            pattern: /^buy:item:(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageText(buildMethodScreen(itemId), {
                        parse_mode: "Markdown",
                        reply_markup: buildMethodKeyboard(itemId)
                    });
                } catch { /* ignore */ }
            }
        },

        // ─── Instant USSD Push ────────────────────
        {
            pattern: /^buy:push:(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const item = manual.PRICES[itemId];

                if (!item) {
                    return ctx.answerCallbackQuery({
                        text: "Unknown package",
                        show_alert: true
                    });
                }

                await ctx.answerCallbackQuery();

                // Store awaiting phone state
                await cache.set(
                    `payment:awaiting_phone:${ctx.from.id}`,
                    { itemId, method: "sonicpesa" },
                    600
                );

                await ctx.reply(
                    `⚡ *Instant Payment*\n\n` +
                    `▸ Item    ➤ ${item.label}\n` +
                    `▸ Amount  ➤ ${item.tsh}\n\n` +
                    `▸ Send your phone number to continue.\n` +
                    `▸ Format: 0745 123 456\n\n` +
                    `▸ A USSD popup will appear on your phone.\n` +
                    `▸ Enter your PIN to complete.\n\n` +
                    `▸ Cancel: /cancel`,
                    { parse_mode: "Markdown" }
                );
            }
        },

        // ─── Manual method selected ───────────────
        {
            pattern: /^buy:method:([^:]+):(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const method = ctx.match[2];

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageText(
                        buildManualInstructions(itemId, method),
                        {
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: "✓ I have paid",
                                            callback_data: `buy:paid:${itemId}:${method}`
                                        }
                                    ],
                                    [
                                        { text: "◀ Back", callback_data: `buy:item:${itemId}` }
                                    ]
                                ]
                            }
                        }
                    );
                } catch { /* ignore */ }
            }
        },

        // ─── User confirms paid ───────────────────
        {
            pattern: /^buy:paid:([^:]+):(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const method = ctx.match[2];

                await ctx.answerCallbackQuery({ text: "Send screenshot next" });

                await ctx.reply(
                    `◈ *Next Step*\n\n` +
                    `▸ Send a *screenshot* of your payment\n` +
                    `▸ Include transaction ID in caption\n\n` +
                    `▸ Item    ➤ ${manual.PRICES[itemId]?.label}\n` +
                    `▸ Method  ➤ ${manual.METHODS[method]?.name}\n\n` +
                    `▸ Admin will approve shortly.`,
                    { parse_mode: "Markdown" }
                );

                await cache.set(
                    `payment:waiting:${ctx.from.id}`,
                    { itemId, method },
                    3600
                );
            }
        },

        // ─── Back ─────────────────────────────────
        {
            pattern: /^buy:back$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery();
                try {
                    await ctx.editMessageText(buildItemScreen(), {
                        parse_mode: "Markdown",
                        reply_markup: buildItemKeyboard()
                    });
                } catch { /* ignore */ }
            }
        }
    ]
};