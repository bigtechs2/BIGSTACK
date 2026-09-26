// ──────────────────────────────────────────────────
//  BIGSTACK — Telegram Stars Payment Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const logger = require("../../core/logger");

// ─── Prices in Stars ────────────────────────────────
const COIN_PACKAGES = {
    coins_100:  { coins: 100,  stars: 30,   label: "100 Coins" },
    coins_500:  { coins: 500,  stars: 140,  label: "500 Coins" },
    coins_1000: { coins: 1000, stars: 260,  label: "1000 Coins" },
    coins_5000: { coins: 5000, stars: 1000, label: "5000 Coins" }
};

const PREMIUM_PLANS = {
    premium_weekly:  { days: 7,   stars: 150,  label: "Weekly Premium" },
    premium_monthly: { days: 30,  stars: 450,  label: "Monthly Premium" },
    premium_yearly:  { days: 365, stars: 1000, label: "Yearly Premium" }
};

// ══════════════════════════════════════════════════
//  Send Stars invoice
// ══════════════════════════════════════════════════
async function sendInvoice(ctx, itemId) {
    // ─── Look up item ─────────────────────────────
    const coinPkg = COIN_PACKAGES[itemId];
    const premiumPlan = PREMIUM_PLANS[itemId];

    if (!coinPkg && !premiumPlan) {
        throw new Error(`Unknown item: ${itemId}`);
    }

    const item = coinPkg || premiumPlan;
    const isCoin = !!coinPkg;

    const title = item.label;
    const description = isCoin
        ? `Add ${item.coins} coins to your BIGSTACK wallet`
        : `${item.days} days of BIGSTACK Premium`;

    // ─── Send invoice ─────────────────────────────
    await ctx.replyWithInvoice(
        title,
        description,
        `bigstack_${itemId}_${Date.now()}`,  // payload
        "XTR",                                // currency = Telegram Stars
        [{ label: title, amount: item.stars }],  // prices
        {
            // Optional: photo URL
            // provider_token: ""  (empty for Stars)
        }
    );

    logger.info(`[stars] invoice sent for ${itemId} to ${ctx.from.id}`);

    return { itemId, item, isCoin };
}

// ══════════════════════════════════════════════════
//  Parse payload
// ══════════════════════════════════════════════════
function parsePayload(payload) {
    // Format: bigstack_<itemId>_<timestamp>
    const parts = String(payload).split("_");
    if (parts.length < 3) return null;

    // itemId may contain underscores ⏤ join the middle parts
    const itemId = parts.slice(1, -1).join("_");
    return { itemId };
}

// ══════════════════════════════════════════════════
//  Pre-checkout handler
// ══════════════════════════════════════════════════
async function preCheckout(ctx) {
    const query = ctx.preCheckoutQuery;

    const parsed = parsePayload(query.invoice_payload);
    if (!parsed) {
        return ctx.answerPreCheckoutQuery(false, "Invalid payment");
    }

    // Always approve ⏤ we trust Telegram
    await ctx.answerPreCheckoutQuery(true);
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    sendInvoice,
    parsePayload,
    preCheckout,
    COIN_PACKAGES,
    PREMIUM_PLANS
};