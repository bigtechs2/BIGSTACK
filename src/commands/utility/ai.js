// ──────────────────────────────────────────────────
//  BIGSTACK — /ai Command
//  AI control center with ON/OFF
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const session = require("../../services/ai/session.service");

// ══════════════════════════════════════════════════
//  Build the control center screen
// ══════════════════════════════════════════════════
function buildScreen(status) {
    const statusIcon = status.enabled ? "◉" : "○";
    const statusText = status.enabled ? "ACTIVE" : "INACTIVE";

    return (
        `◈ AI CONTROL CENTER\n\n` +
        `◉ BIGST4CK-AI\n\n` +
        `◐ Status   ➤  ${statusIcon} ${statusText}\n` +
        `◐ Free     ➤  ${status.remaining} / ${status.limit} today\n` +
        `◐ Memory   ➤  ◉ forever\n\n` +
        (status.enabled
            ? `▸ Send any message to chat with me\n▸ I will reply automatically`
            : `▸ Turn ON to start chatting\n▸ I will respond to every message`)
    );
}

// ══════════════════════════════════════════════════
//  Build keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(enabled) {
    const row = [];

    if (enabled) {
        row.push({ text: "○ Turn OFF", callback_data: "ai:off" });
    } else {
        row.push({ text: "◉ Turn ON", callback_data: "ai:on" });
    }

    return {
        inline_keyboard: [row]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "ai",
    aliases: ["chat", "ask", "gpt"],
    category: "utility",
    description: "AI assistant control center",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const userId = String(ctx.from.id);
        const status = await session.getStatus(userId);

        await ctx.reply(buildScreen(status), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard(status.enabled)
        });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        // ─── Turn ON ──────────────────────────────
        {
            pattern: /^ai:on$/,
            handler: async (ctx) => {
                const userId = String(ctx.from.id);

                await session.enable(userId);
                logger.info(`[/ai] user ${userId} enabled AI`);

                await ctx.answerCallbackQuery({ text: "◉ AI activated" });

                const status = await session.getStatus(userId);

                await ctx
                    .editMessageText(buildScreen(status), {
                        parse_mode: "Markdown",
                        reply_markup: buildKeyboard(true)
                    })
                    .catch(() => {});
            }
        },

        // ─── Turn OFF ─────────────────────────────
        {
            pattern: /^ai:off$/,
            handler: async (ctx) => {
                const userId = String(ctx.from.id);

                await session.disable(userId);
                logger.info(`[/ai] user ${userId} disabled AI`);

                await ctx.answerCallbackQuery({ text: "○ AI disabled" });

                const status = await session.getStatus(userId);

                await ctx
                    .editMessageText(buildScreen(status), {
                        parse_mode: "Markdown",
                        reply_markup: buildKeyboard(false)
                    })
                    .catch(() => {});
            }
        }
    ]
};