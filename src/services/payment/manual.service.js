// ──────────────────────────────────────────────────
//  BIGSTACK — Manual Payment Service
//  M-Pesa / Tigo / Airtel / Crypto
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const Payment = require("../../database/models/Payment");
const User = require("../../database/models/User");
const Transaction = require("../../database/models/Transaction");

// ══════════════════════════════════════════════════
//  Manual methods
// ══════════════════════════════════════════════════
const METHODS = {
    mpesa:     { name: "M-Pesa",       emoji: "◈", number: config.payments?.mpesa || "+255 XXX XXX XXX" },
    tigopesa:  { name: "Tigo Pesa",    emoji: "◉", number: config.payments?.tigopesa || "+255 XXX XXX XXX" },
    airtel:    { name: "Airtel Money", emoji: "▣", number: config.payments?.airtel || "+255 XXX XXX XXX" },
    halopesa:  { name: "HaloPesa",     emoji: "★", number: config.payments?.halopesa || "+255 XXX XXX XXX" },
    crypto:    { name: "Crypto (USDT)", emoji: "☆", wallet: config.payments?.usdtTrc20 || "T..." }
};

// ─── Price list ─────────────────────────────────────
const PRICES = {
    coins_100:  { label: "100 Coins",   coins: 100,  tsh: "500 TSh",     usd: "0.50 USDT" },
    coins_500:  { label: "500 Coins",   coins: 500,  tsh: "2,000 TSh",   usd: "2.50 USDT" },
    coins_1000: { label: "1000 Coins",  coins: 1000, tsh: "3,500 TSh",   usd: "4.50 USDT" },
    coins_5000: { label: "5000 Coins",  coins: 5000, tsh: "15,000 TSh",  usd: "20.00 USDT" },

    premium_weekly:  { label: "Weekly Premium",  days: 7,   tsh: "4,000 TSh",   usd: "5.00 USDT" },
    premium_monthly: { label: "Monthly Premium", days: 30,  tsh: "12,000 TSh",  usd: "15.00 USDT" },
    premium_yearly:  { label: "Yearly Premium",  days: 365, tsh: "40,000 TSh",  usd: "50.00 USDT" }
};

// ══════════════════════════════════════════════════
//  Create a payment request
// ══════════════════════════════════════════════════
async function createRequest(user, itemId, method, screenshot = null, reference = null, notes = null) {
    const item = PRICES[itemId];
    if (!item) throw new Error(`Unknown item: ${itemId}`);

    const isCoin = itemId.startsWith("coins_");
    const methodInfo = METHODS[method];
    if (!methodInfo) throw new Error(`Unknown method: ${method}`);

    const amount = method === "crypto" ? item.usd : item.tsh;

    const payment = await Payment.create({
        userId: String(user.telegramId),
        username: user.username || null,
        firstName: user.firstName || null,
        itemType: isCoin ? "coins" : "premium",
        itemId,
        itemLabel: item.label,
        coinsAmount: item.coins || 0,
        premiumDays: item.days || 0,
        method,
        amountPaid: amount,
        reference,
        screenshot,
        notes,
        status: "pending"
    });

    logger.info(`[payment] new request: ${user.telegramId} → ${itemId} via ${method}`);

    return payment;
}

// ══════════════════════════════════════════════════
//  Approve a payment
// ══════════════════════════════════════════════════
async function approve(paymentId, adminId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "pending") throw new Error("Payment already processed");

    // ─── Fetch user ──────────────────────────────
    const user = await User.findOne({ telegramId: payment.userId });
    if (!user) throw new Error("User not found");

    // ─── Credit ──────────────────────────────────
    if (payment.itemType === "coins") {
        user.coins += payment.coinsAmount;
        user.totalEarned += payment.coinsAmount;

        await Transaction.log({
            userId: payment.userId,
            type: "buy",
            amount: payment.coinsAmount,
            balanceAfter: user.coins,
            reason: `Purchased ${payment.itemLabel}`,
            source: payment.method,
            payment: {
                method: payment.method,
                reference: payment.reference,
                amountPaid: payment.amountPaid
            }
        });
    } else if (payment.itemType === "premium") {
        // ─── Grant premium ───────────────────────
        const plan = payment.itemId.replace("premium_", "");
        user.upgradePremium(plan);

        await Transaction.log({
            userId: payment.userId,
            type: "premium",
            amount: 0,
            balanceAfter: user.coins,
            reason: `Purchased ${payment.itemLabel}`,
            source: payment.method,
            payment: {
                method: payment.method,
                reference: payment.reference,
                amountPaid: payment.amountPaid
            }
        });
    }

    await user.save();

    // ─── Update payment ──────────────────────────
    payment.status = "approved";
    payment.reviewedBy = String(adminId);
    payment.reviewedAt = new Date();
    await payment.save();

    logger.info(`[payment] approved: ${payment._id} by admin ${adminId}`);

    return { payment, user };
}

// ══════════════════════════════════════════════════
//  Reject a payment
// ══════════════════════════════════════════════════
async function reject(paymentId, adminId, reason = "No reason given") {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "pending") throw new Error("Payment already processed");

    payment.status = "rejected";
    payment.reviewedBy = String(adminId);
    payment.reviewedAt = new Date();
    payment.rejectReason = reason;
    await payment.save();

    logger.info(`[payment] rejected: ${payment._id} by admin ${adminId}: ${reason}`);

    return payment;
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    createRequest,
    approve,
    reject,
    METHODS,
    PRICES
};