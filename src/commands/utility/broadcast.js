// ──────────────────────────────────────────────────
//  BIGSTACK — /broadcast Command (Owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../../src/config");
const logger = require("../../../src/core/logger");
const User = require("../../../src/database/models/User");

module.exports = {
    name: "broadcast",
    aliases: ["bc", "announce"],
    category: "utility",
    description: "Send message to all users (owner)",
    emoji: "◈",
    usage: "<reply to message or text>",
    permissions: { coin: 0, owner: true, admin: false, premium: false, group: false, private: true },

    code: async (ctx) => {
        const reply = ctx.message?.reply_to_message;
        const text = ctx.args.join(" ").trim();
        const messageText = reply?.text || reply?.caption || text;

        if (!messageText) {
            return ctx.reply(`◈ *BROADCAST*\n\n▸ Reply to a message with /broadcast\n▸ Or: /broadcast <text>`, { parse_mode: "Markdown" });
        }

        await ctx.reply(
            `◐ *Broadcast ready*\n\n▸ Message:\n\n${messageText.slice(0, 200)}${messageText.length > 200 ? "..." : ""}\n\n▸ Send to ALL users?`,
            {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: [[
                    { text: "✓ Send", callback_data: "bc:send" },
                    { text: "✗ Cancel", callback_data: "bc:cancel" }
                ]] }
            }
        );
    },

    callbacks: [
        {
            pattern: /^bc:send$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Broadcasting..." });
                const progressMsg = await ctx.reply("◐ Broadcasting to all users...");

                const users = await User.find({ banned: false }).select("telegramId").lean();
                let sent = 0, failed = 0;

                for (const user of users) {
                    try {
                        await ctx.api.sendMessage(user.telegramId, "◈ *BIGSTACK Update*\n\n" + (ctx.callbackQuery.message.text || "").slice(0, 500));
                        sent++;
                        if (sent % 20 === 0) await new Promise(r => setTimeout(r, 1000));
                    } catch { failed++; }
                }

                await ctx.api.editMessageText(ctx.chat.id, progressMsg.message_id,
                    `✓ *Broadcast Complete*\n\n▸ Sent ➤ ${sent}\n▸ Failed ➤ ${failed}\n▸ Total ➤ ${users.length}`,
                    { parse_mode: "Markdown" }
                );
                logger.info(`[/broadcast] sent=${sent} failed=${failed}`);
            }
        },
        {
            pattern: /^bc:cancel$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Cancelled" });
                try { await ctx.deleteMessage(); } catch {}
            }
        }
    ]
};
