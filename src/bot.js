// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Instance
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { Bot } = require("grammy");
const { hydrateReply } = require("@grammyjs/parse-mode");
const { autoRetry } = require("@grammyjs/auto-retry");
const { stream } = require("@grammyjs/stream");

const config = require("./config");
const logger = require("./core/logger");
const errorForwarder = require("./core/errorForwarder");

// ══════════════════════════════════════════════════
//  CREATE BOT INSTANCE
// ══════════════════════════════════════════════════

const bot = new Bot(process.env.BOT_TOKEN, {
    client: {
        timeoutSeconds: 60
    }
});

// ─── Attach config ──────────────────────────────────
bot.config = config;

// ══════════════════════════════════════════════════
//  RICH MESSAGE PLUGINS
// ══════════════════════════════════════════════════

// ─── 1. Auto-retry ──────────────────────────────────
bot.api.config.use(
    autoRetry({
        maxRetryAttempts: 3,
        maxDelaySeconds: 5
    })
);

// ─── 2. Parse mode ──────────────────────────────────
bot.use(hydrateReply);

// ─── 3. Stream ──────────────────────────────────────
bot.use(stream());

// ══════════════════════════════════════════════════
//  ATTACH BOT TO LOGGER
// ══════════════════════════════════════════════════

logger.attachBot(bot);

// ══════════════════════════════════════════════════
//  PAYMENT HANDLERS
// ══════════════════════════════════════════════════

// ─── Pre-checkout query ─────────────────────────────
bot.on("pre_checkout_query", async (ctx) => {
    try {
        const starsService = require("./services/payment/stars.service");
        await starsService.preCheckout(ctx);
    } catch (err) {
        logger.error(`[stars] precheckout failed: ${err.message}`);
        await ctx.answerPreCheckoutQuery(false, "Payment failed").catch(() => {});
    }
});

// ─── Successful payment ─────────────────────────────
bot.on("message:successful_payment", async (ctx) => {
    try {
        const User = require("./database/models/User");
        const Transaction = require("./database/models/Transaction");
        const starsService = require("./services/payment/stars.service");

        const payment = ctx.message.successful_payment;
        const parsed = starsService.parsePayload(payment.invoice_payload);

        if (!parsed) return;

        const { itemId } = parsed;
        const user = await User.findOne({ telegramId: String(ctx.from.id) });
        if (!user) return;

        const coinPkg = starsService.COIN_PACKAGES[itemId];
        const premiumPlan = starsService.PREMIUM_PLANS[itemId];

        if (coinPkg) {
            // ─── Credit coins ─────────────────────
            user.coins += coinPkg.coins;
            user.totalEarned += coinPkg.coins;
            await user.save();

            await Transaction.log({
                userId: user.telegramId,
                type: "buy",
                amount: coinPkg.coins,
                balanceAfter: user.coins,
                reason: `Purchased ${coinPkg.label}`,
                source: "stars",
                payment: {
                    method: "stars",
                    reference: payment.telegram_payment_charge_id,
                    amountPaid: `${payment.total_amount} Stars`
                }
            });

            await ctx.reply(
                `✓ *Payment Successful*\n\n` +
                `▸ Coins received ➤ +${coinPkg.coins} 🪙\n` +
                `▸ New balance    ➤ ${user.coins} 🪙\n\n` +
                `▸ Thanks for your purchase!`,
                { parse_mode: "Markdown" }
            );
        } else if (premiumPlan) {
            // ─── Grant premium ────────────────────
            const plan = itemId.replace("premium_", "");
            user.upgradePremium(plan);
            await user.save();

            await Transaction.log({
                userId: user.telegramId,
                type: "premium",
                amount: 0,
                balanceAfter: user.coins,
                reason: `Purchased ${premiumPlan.label}`,
                source: "stars",
                payment: {
                    method: "stars",
                    reference: payment.telegram_payment_charge_id,
                    amountPaid: `${payment.total_amount} Stars`
                }
            });

            await ctx.reply(
                `✓ *Premium Activated*\n\n` +
                `▸ Plan     ➤ ${premiumPlan.label}\n` +
                `▸ Expires  ➤ ${user.premiumExpiry.toLocaleDateString("en-GB")}\n\n` +
                `▸ Enjoy premium features!`,
                { parse_mode: "Markdown" }
            );
        }

        logger.info(`[stars] payment success: ${ctx.from.id} → ${itemId}`);
    } catch (err) {
        logger.error(`[stars] payment handler failed: ${err.message}`);
    }
});

// ══════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ══════════════════════════════════════════════════

bot.catch(async (err) => {
    const ctx = err.ctx;
    const error = err.error;

    // ─── 1. Log locally ─────────────────────────────
    logger.error(`[bot.catch] update ${ctx?.update?.update_id}: ${error?.message || error}`);

    // ─── 2. Forward to ERRORS group ─────────────────
    try {
        await errorForwarder.forwardGlobalError(error, ctx);
    } catch (e) {
        logger.warn(`[bot.catch] forwarding failed: ${e.message}`);
    }

    // ─── 3. Reply to user ───────────────────────────
    try {
        if (ctx && typeof ctx.reply === "function") {
            if (!ctx.__errorReplied) {
                await ctx.reply(
                    config.messages?.error ||
                        "✗  Something went wrong. Please try again later."
                );
                ctx.__errorReplied = true;
            }
        }
    } catch {
        // User may have blocked the bot
    }
});

// ══════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════

module.exports = bot;