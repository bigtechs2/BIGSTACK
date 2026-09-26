// ──────────────────────────────────────────────────
//  BIGSTACK — /approve and /reject
//  Admin approves manual payments
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const manual = require("../../services/payment/manual.service");
const Payment = require("../../database/models/Payment");

// ══════════════════════════════════════════════════
//  /pending ⏤ list pending payments
// ══════════════════════════════════════════════════
const pendingCommand = {
    name: "pending",
    aliases: ["payments", "queue"],
    category: "utility",
    description: "Show pending payments (admin)",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: true,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const pending = await Payment.getPending();

        if (pending.length === 0) {
            return ctx.reply(
                `◈ *No Pending Payments*\n\n▸ All caught up.`,
                { parse_mode: "Markdown" }
            );
        }

        let text = `◈ *PENDING PAYMENTS (${pending.length})*\n\n`;

        for (const p of pending.slice(0, 10)) {
            text += `▸ *${p.itemLabel}*\n`;
            text += `   User      ➤ ${p.firstName || "Unknown"} (@${p.username || "no-user"})\n`;
            text += `   ID        ➤ \`${p.userId}\`\n`;
            text += `   Method    ➤ ${p.method}\n`;
            text += `   Amount    ➤ ${p.amountPaid}\n`;
            text += `   Reference ➤ ${p.reference || "none"}\n`;
            text += `   Payment ID ➤ \`${p._id}\`\n\n`;
        }

        if (pending.length > 10) {
            text += `▸ ...and ${pending.length - 10} more\n\n`;
        }

        text += `▸ Approve: /approve <payment_id>\n`;
        text += `▸ Reject:  /reject <payment_id> <reason>\n\n`;
        text += `▸ ${config.footer}`;

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};

// ══════════════════════════════════════════════════
//  /approve
// ══════════════════════════════════════════════════
const approveCommand = {
    name: "approve",
    aliases: ["confirm"],
    category: "utility",
    description: "Approve a payment (admin)",
    emoji: "◈",
    usage: "<payment_id>",

    permissions: {
        coin: 0,
        owner: false,
        admin: true,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const paymentId = ctx.args[0];

        if (!paymentId) {
            return ctx.reply(
                `◈ *APPROVE*\n\n▸ Usage: /approve <payment_id>`,
                { parse_mode: "Markdown" }
            );
        }

        try {
            const { payment, user } = await manual.approve(paymentId, ctx.from.id);

            await ctx.reply(
                `✓ *Payment Approved*\n\n` +
                `▸ User      ➤ ${user.firstName || "Unknown"}\n` +
                `▸ User ID   ➤ \`${user.telegramId}\`\n` +
                `▸ Item      ➤ ${payment.itemLabel}\n` +
                `▸ Amount    ➤ ${payment.amountPaid}\n\n` +
                `▸ User has been credited.`,
                { parse_mode: "Markdown" }
            );

            // ─── Notify user ─────────────────────
            try {
                const message = payment.itemType === "coins"
                    ? `✓ *Payment Approved*\n\n` +
                      `▸ You received ➤ +${payment.coinsAmount} 🪙\n` +
                      `▸ New balance  ➤ ${user.coins} 🪙\n\n` +
                      `▸ Thanks for your purchase!`
                    : `✓ *Premium Activated*\n\n` +
                      `▸ Plan     ➤ ${payment.itemLabel}\n` +
                      `▸ Expires  ➤ ${user.premiumExpiry?.toLocaleDateString("en-GB")}\n\n` +
                      `▸ Enjoy premium features!`;

                await ctx.api.sendMessage(user.telegramId, message, { parse_mode: "Markdown" });
            } catch {
                // User may have blocked the bot
            }

        } catch (err) {
            logger.error(`[/approve] ${err.message}`);
            await ctx.reply(
                `✗ *Failed to approve*\n\n▸ Reason: ${err.message}`,
                { parse_mode: "Markdown" }
            );
        }
    }
};

// ══════════════════════════════════════════════════
//  /reject
// ══════════════════════════════════════════════════
const rejectCommand = {
    name: "reject",
    aliases: ["deny"],
    category: "utility",
    description: "Reject a payment (admin)",
    emoji: "◈",
    usage: "<payment_id> [reason]",

    permissions: {
        coin: 0,
        owner: false,
        admin: true,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const paymentId = ctx.args[0];
        const reason = ctx.args.slice(1).join(" ") || "No reason given";

        if (!paymentId) {
            return ctx.reply(
                `◈ *REJECT*\n\n▸ Usage: /reject <payment_id> [reason]`,
                { parse_mode: "Markdown" }
            );
        }

        try {
            const payment = await manual.reject(paymentId, ctx.from.id, reason);

            await ctx.reply(
                `✗ *Payment Rejected*\n\n` +
                `▸ Payment ID ➤ \`${payment._id}\`\n` +
                `▸ Reason     ➤ ${reason}`,
                { parse_mode: "Markdown" }
            );

            // ─── Notify user ─────────────────────
            try {
                await ctx.api.sendMessage(
                    payment.userId,
                    `✗ *Payment Rejected*\n\n` +
                    `▸ Item   ➤ ${payment.itemLabel}\n` +
                    `▸ Reason ➤ ${reason}\n\n` +
                    `▸ Contact support if you think this is wrong.`,
                    { parse_mode: "Markdown" }
                );
            } catch {
                // User may have blocked the bot
            }

        } catch (err) {
            logger.error(`[/reject] ${err.message}`);
            await ctx.reply(
                `✗ *Failed to reject*\n\n▸ Reason: ${err.message}`,
                { parse_mode: "Markdown" }
            );
        }
    }
};

// ─── Export ─────────────────────────────────────────
module.exports = {
    pending: pendingCommand,
    approve: approveCommand,
    reject: rejectCommand
};