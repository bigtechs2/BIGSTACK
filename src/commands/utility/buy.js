// ──────────────────────────────────────────────────
//  BIGSTACK — /buy Command
//  Manual payment flow (M-Pesa / Tigo / Airtel / Crypto)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const manual = require("../../services/payment/manual.service");

// ══════════════════════════════════════════════════
//  Build item selection screen
// ══════════════════════════════════════════════════
function buildItemScreen() {
    return (
        `◈ *BUY WITH MOBILE MONEY*\n\n` +
        `▸ Choose what to buy:\n\n` +

        `◈ *Coins*\n` +
        `   ➤ 100 Coins   ➤ 500 TSh\n` +
        `   ➤ 500 Coins   ➤ 2,000 TSh\n` +
        `   ➤ 1000 Coins  ➤ 3,500 TSh\n` +
        `   ➤ 5000 Coins  ➤ 15,000 TSh\n\n` +

        `★ *Premium*\n` +
        `   ➤ Weekly      ➤ 4,000 TSh\n` +
        `   ➤ Monthly     ➤ 12,000 TSh\n` +
        `   ➤ Yearly      ➤ 40,000 TSh\n\n` +

        `▸ ${config.footer}`
    );
}

function buildItemKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "100 Coins · 500 TSh", callback_data: "buy:item:coins_100" },
                { text: "500 Coins · 2,000 TSh", callback_data: "buy:item:coins_500" }
            ],
            [
                { text: "1000 Coins · 3,500 TSh", callback_data: "buy:item:coins_1000" },
                { text: "5000 Coins · 15,000 TSh", callback_data: "buy:item:coins_5000" }
            ],
            [
                { text: "★ Weekly · 4,000 TSh", callback_data: "buy:item:premium_weekly" }
            ],
            [
                { text: "★ Monthly · 12,000 TSh", callback_data: "buy:item:premium_monthly" }
            ],
            [
                { text: "★ Yearly · 40,000 TSh", callback_data: "buy:item:premium_yearly" }
            ],
            [
                { text: "◀ Back", callback_data: "menu:home" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Build method selection
// ══════════════════════════════════════════════════
function buildMethodScreen(itemId) {
    const item = manual.PRICES[itemId];
    if (!item) return "Unknown item";

    return (
        `◈ *SELECT PAYMENT METHOD*\n\n` +
        `▸ Item  ➤ ${item.label}\n` +
        `▸ Price ➤ ${item.tsh}\n\n` +
        `▸ Choose how you want to pay:`
    );
}

function buildMethodKeyboard(itemId) {
    return {
        inline_keyboard: [
            [
                { text: "◈ M-Pesa", callback_data: `buy:method:${itemId}:mpesa` },
                { text: "◉ Tigo Pesa", callback_data: `buy:method:${itemId}:tigopesa` }
            ],
            [
                { text: "▣ Airtel Money", callback_data: `buy:method:${itemId}:airtel` },
                { text: "★ HaloPesa", callback_data: `buy:method:${itemId}:halopesa` }
            ],
            [
                { text: "☆ Crypto (USDT)", callback_data: `buy:method:${itemId}:crypto` }
            ],
            [
                { text: "◀ Back", callback_data: "buy:back" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Build payment instructions
// ══════════════════════════════════════════════════
function buildPaymentInstructions(itemId, methodKey) {
    const item = manual.PRICES[itemId];
    const method = manual.METHODS[methodKey];

    if (!item || !method) return "Unknown item or method";

    const isCrypto = methodKey === "crypto";
    const amount = isCrypto ? item.usd : item.tsh;
    const destination = isCrypto ? method.wallet : method.number;

    return (
        `◈ *PAYMENT INSTRUCTIONS*\n\n` +
        `▸ Item       ➤ ${item.label}\n` +
        `▸ Amount     ➤ ${amount}\n` +
        `▸ Method     ➤ ${method.name}\n\n` +

        `◈ *Send payment to:*\n` +
        `   \`${destination}\`\n\n` +

        `▸ *Steps*\n` +
        `   1. Send ${amount} to the address above\n` +
        `   2. Take a screenshot of the confirmation\n` +
        `   3. Send the screenshot here\n` +
        `   4. Wait for approval (usually under 1 hour)\n\n` +

        `▸ Include your Telegram ID in the payment note:\n` +
        `   \`${amount} your telegram id\`\n\n` +

        `▸ Once paid, send a screenshot here.\n\n` +

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
    description: "Buy coins or premium manually",
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
                } catch {
                    // Ignore
                }
            }
        },

        // ─── Method selected ──────────────────────
        {
            pattern: /^buy:method:([^:]+):(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const method = ctx.match[2];

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageText(
                        buildPaymentInstructions(itemId, method),
                        {
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: [[
                                    {
                                        text: "✓ I have paid",
                                        callback_data: `buy:paid:${itemId}:${method}`
                                    }
                                ], [
                                    { text: "◀ Back", callback_data: `buy:item:${itemId}` }
                                ]]
                            }
                        }
                    );
                } catch {
                    // Ignore
                }
            }
        },

        // ─── User says "I have paid" ──────────────
        {
            pattern: /^buy:paid:([^:]+):(.+)$/,
            handler: async (ctx) => {
                const itemId = ctx.match[1];
                const method = ctx.match[2];

                await ctx.answerCallbackQuery({ text: "Sending instructions..." });

                await ctx.reply(
                    `◈ *Next Step*\n\n` +
                    `▸ Send me a *screenshot* of your payment\n` +
                    `▸ Include the transaction ID in the caption\n\n` +
                    `▸ Item    ➤ ${manual.PRICES[itemId]?.label}\n` +
                    `▸ Method  ➤ ${manual.METHODS[method]?.name}\n` +
                    `▸ Amount  ➤ ${method === "crypto" ? manual.PRICES[itemId]?.usd : manual.PRICES[itemId]?.tsh}\n\n` +
                    `▸ I will forward it to the admin for approval.`,
                    { parse_mode: "Markdown" }
                );

                // Store waiting state in cache
                const cache = require("../../core/cache");
                await cache.set(`payment:waiting:${ctx.from.id}`, { itemId, method }, 3600);
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
                } catch {
                    // Ignore
                }
            }
        }
    ]
};