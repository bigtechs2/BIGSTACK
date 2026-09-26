// ──────────────────────────────────────────────────
//  BIGSTACK — /ai Command
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ══════════════════════════════════════════════════

const logger = require("../../core/logger");
const session = require("../../services/ai/session.service");

function buildScreen(status) {
    const icon = status.enabled ? "◉" : "○";
    const label = status.enabled ? "ACTIVE" : "INACTIVE";

    return (
        `◈ AI CONTROL CENTER\n\n` +
        `◉ BIGST4CK-AI\n\n` +
        `◐ Status   ➤ ${icon} ${label}\n` +
        `◐ Free     ➤ ${status.remaining} / ${status.limit} today\n` +
        `◐ Features ➤ chat · vision · voice · image\n` +
        `◐ Memory   ➤ ◉ forever\n\n` +
        (status.enabled
            ? `▸ Send any message to chat\n▸ Send voice note to talk\n▸ Send photo to describe\n▸ Say "create image of..." for art`
            : `▸ Turn ON to start`)
    );
}

function buildKeyboard(enabled) {
    return {
        inline_keyboard: [[
            enabled
                ? { text: "○ Turn OFF", callback_data: "ai:off" }
                : { text: "◉ Turn ON", callback_data: "ai:on" }
        ]]
    };
}

module.exports = {
    name: "ai",
    aliases: ["chat", "ask", "gpt"],
    category: "utility",
    description: "AI assistant control center",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: { coin: 0, owner: false, admin: false, premium: false, group: true, private: true },

    code: async (ctx) => {
        const status = await session.getStatus(String(ctx.from.id));
        await ctx.reply(buildScreen(status), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard(status.enabled)
        });
    },

    callbacks: [
        {
            pattern: /^ai:on$/,
            handler: async (ctx) => {
                const userId = String(ctx.from.id);
                await session.enable(userId);
                await ctx.answerCallbackQuery({ text: "◉ AI activated" });
                const status = await session.getStatus(userId);
                await ctx.editMessageText(buildScreen(status), {
                    parse_mode: "Markdown",
                    reply_markup: buildKeyboard(true)
                }).catch(() => {});
            }
        },
        {
            pattern: /^ai:off$/,
            handler: async (ctx) => {
                const userId = String(ctx.from.id);
                await session.disable(userId);
                await ctx.answerCallbackQuery({ text: "○ AI disabled" });
                const status = await session.getStatus(userId);
                await ctx.editMessageText(buildScreen(status), {
                    parse_mode: "Markdown",
                    reply_markup: buildKeyboard(false)
                }).catch(() => {});
            }
        }
    ]
};