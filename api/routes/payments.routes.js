// ──────────────────────────────────────────────────
//  BIGSTACK — Payment Webhook Route
//  Receives SonicPesa callbacks ⏤ credits user
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const logger = require("../../src/core/logger");
const sonicpesa = require("../../src/services/payment/sonicpesa.service");
const Payment = require("../../src/database/models/Payment");
const User = require("../../src/database/models/User");
const Transaction = require("../../src/database/models/Transaction");

// ══════════════════════════════════════════════════
//  POST /api/payment/webhook
// ══════════════════════════════════════════════════
router.post("/webhook", async (req, res) => {
    try {
        logger.info(`[webhook] received`);

        // ─── Validate ───────────────────────────────
        if (!sonicpesa.verifyWebhook(req.body)) {
            logger.warn("[webhook] invalid payload");
            return res.status(400).json({ error: "Invalid payload" });
        }

        const parsed = sonicpesa.parseWebhook(req.body);
        logger.info(`[webhook] ref=${parsed.reference} status=${parsed.status}`);

        if (!parsed.reference) {
            return res.status(400).json({ error: "Missing reference" });
        }

        // ─── Find pending payment ───────────────────
        const payment = await Payment.findOne({
            reference: parsed.reference,
            status: "pending"
        });

        if (!payment) {
            logger.warn(`[webhook] no pending payment for ${parsed.reference}`);
            return res.json({ received: true, matched: false });
        }

        // ─── Route by status ────────────────────────
        if (parsed.isSuccess) {
            await handleSuccess(payment, parsed);
        } else if (parsed.isFailed) {
            await handleFailure(payment, parsed);
        } else {
            logger.info(`[webhook] intermediate status: ${parsed.status}`);
        }

        res.json({ received: true, matched: true });

    } catch (err) {
        logger.error(`[webhook] failed: ${err.message}`);
        res.status(500).json({ error: "Webhook failed" });
    }
});

// ══════════════════════════════════════════════════
//  Success handler
// ══════════════════════════════════════════════════
async function handleSuccess(payment, parsed) {
    const user = await User.findOne({ telegramId: payment.userId });
    if (!user) return logger.warn(`[webhook] user ${payment.userId} not found`);

    // ─── Credit coins or premium ─────────────────
    if (payment.itemType === "coins") {
        user.coins += payment.coinsAmount;
        user.totalEarned += payment.coinsAmount;

        await Transaction.log({
            userId: user.telegramId,
            type: "buy",
            amount: payment.coinsAmount,
            balanceAfter: user.coins,
            reason: `Purchased ${payment.itemLabel}`,
            source: "sonicpesa",
            payment: {
                method: payment.method,
                reference: parsed.reference,
                amountPaid: payment.amountPaid
            }
        });
    } else if (payment.itemType === "premium") {
        const plan = payment.itemId.replace("premium_", "");
        user.upgradePremium(plan);

        await Transaction.log({
            userId: user.telegramId,
            type: "premium",
            amount: 0,
            balanceAfter: user.coins,
            reason: `Purchased ${payment.itemLabel}`,
            source: "sonicpesa",
            payment: {
                method: payment.method,
                reference: parsed.reference,
                amountPaid: payment.amountPaid
            }
        });
    }

    await user.save();

    // ─── Update payment ──────────────────────────
    payment.status = "approved";
    payment.reviewedBy = "sonicpesa";
    payment.reviewedAt = new Date();
    if (parsed.transactionId) payment.reference = parsed.transactionId;
    await payment.save();

    logger.info(`[webhook] ✓ credited ${user.telegramId}`);

    // ─── Notify user via bot ─────────────────────
    try {
        const bot = require("../../src/bot");

        const message =
            payment.itemType === "coins"
                ? `✓ *Payment Received*\n\n` +
                  `▸ Item       ➤ ${payment.itemLabel}\n` +
                  `▸ Coins      ➤ +${payment.coinsAmount} 🪙\n` +
                  `▸ Balance    ➤ ${user.coins} 🪙\n\n` +
                  `▸ Thanks for your purchase!`
                : `✓ *Premium Activated*\n\n` +
                  `▸ Plan       ➤ ${payment.itemLabel}\n` +
                  `▸ Expires    ➤ ${user.premiumExpiry?.toLocaleDateString("en-GB")}\n\n` +
                  `▸ Enjoy premium features!`;

        await bot.api.sendMessage(user.telegramId, message, {
            parse_mode: "Markdown"
        });
    } catch (err) {
        logger.warn(`[webhook] notify failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  Failure handler
// ══════════════════════════════════════════════════
async function handleFailure(payment, parsed) {
    payment.status = "rejected";
    payment.reviewedBy = "sonicpesa";
    payment.reviewedAt = new Date();
    payment.rejectReason = parsed.status || "Payment failed";
    await payment.save();

    logger.info(`[webhook] ✗ failed: ${payment._id}`);

    try {
        const bot = require("../../src/bot");

        await bot.api.sendMessage(
            payment.userId,
            `✗ *Payment Failed*\n\n` +
            `▸ Item    ➤ ${payment.itemLabel}\n` +
            `▸ Reason  ➤ ${parsed.status || "cancelled"}\n\n` +
            `▸ Try again with /buy`,
            { parse_mode: "Markdown" }
        );
    } catch {
        // Ignore
    }
}

module.exports = router;