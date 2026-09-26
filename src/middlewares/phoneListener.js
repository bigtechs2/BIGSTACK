// ──────────────────────────────────────────────────
//  BIGSTACK — Phone Listener
//  Catches phone numbers during /buy flow
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const cache = require("../core/cache");
const sonicpesa = require("../services/payment/sonicpesa.service");
const manual = require("../services/payment/manual.service");
const Payment = require("../database/models/Payment");
const User = require("../database/models/User");

// ─── Tanzanian phone regex ──────────────────────────
const PHONE_REGEX = /^(\+?255|0)?[67]\d{8}$/;

async function phoneListener(ctx, next) {
    if (!ctx.message?.text) return next();
    if (!ctx.from || ctx.from.is_bot) return next();

    const userId = String(ctx.from.id);
    const text = ctx.message.text.trim();

    // ─── Check if user is awaiting phone ────────────
    const pending = await cache.get(`payment:awaiting_phone:${userId}`);
    if (!pending) return next();

    // ─── /cancel ────────────────────────────────────
    if (text.toLowerCase() === "/cancel") {
        await cache.del(`payment:awaiting_phone:${userId}`);
        return ctx.reply("✓ Payment cancelled.");
    }

    // ─── Validate phone ─────────────────────────────
    if (!PHONE_REGEX.test(text.replace(/\s/g, ""))) {
        return ctx.reply(
            `✗ *Invalid Phone Number*\n\n` +
            `▸ Send a valid Tanzanian number.\n` +
            `▸ Format: 0745 123 456\n` +
            `▸ Or /cancel to abort.`,
            { parse_mode: "Markdown" }
        );
    }

    // ─── Clear state ────────────────────────────────
    await cache.del(`payment:awaiting_phone:${userId}`);

    const item = manual.PRICES[pending.itemId];
    if (!item) return ctx.reply("✗ Unknown package. Try /buy.");

    const loading = await ctx.reply("⚡ Sending USSD prompt to your phone...");

    try {
        const reference = `BS_${userId}_${Date.now()}`;

        // ─── Create payment record ──────────────────
        const payment = await Payment.create({
            userId,
            username: ctx.from.username || null,
            firstName: ctx.from.first_name || null,
            itemType: pending.itemId.startsWith("coins_") ? "coins" : "premium",
            itemId: pending.itemId,
            itemLabel: item.label,
            coinsAmount: item.coins || 0,
            premiumDays: item.days || 0,
            method: "mpesa",
            amountPaid: item.tsh,
            reference,
            status: "pending"
        });

        // ─── Trigger USSD Push ──────────────────────
        const result = await sonicpesa.initiatePayment({
            userId,
            phone: text,
            amount: parseInt(String(item.tsh).replace(/[^\d]/g, "")),
            reference
        });

        if (!result.success) {
            await payment.deleteOne();
            throw new Error(result.message || "Failed to initiate");
        }

        await ctx.api.editMessageText(
            ctx.chat.id,
            loading.message_id,
            `⚡ *USSD Prompt Sent*\n\n` +
            `▸ Item       ➤ ${item.label}\n` +
            `▸ Amount     ➤ ${item.tsh}\n` +
            `▸ Phone      ➤ ${text}\n` +
            `▸ Reference  ➤ \`${reference}\`\n\n` +
            `▸ Check your phone for the M-Pesa popup.\n` +
            `▸ Enter your PIN to complete.\n\n` +
            `▸ Coins added automatically after payment.`,
            { parse_mode: "Markdown" }
        );

        logger.info(`[phoneListener] initiated ${reference} for ${userId}`);

    } catch (err) {
        logger.error(`[phoneListener] failed: ${err.message}`);

        await ctx.api.editMessageText(
            ctx.chat.id,
            loading.message_id,
            `✗ *Payment Failed*\n\n` +
            `▸ Reason: ${err.message}\n\n` +
            `▸ Try /buy again or use manual payment.`,
            { parse_mode: "Markdown" }
        ).catch(() => {});
    }
}

module.exports = phoneListener;