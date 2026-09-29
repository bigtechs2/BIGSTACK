// ──────────────────────────────────────────────────
//  BIGSTACK — /ping Command
//  Check bot response time
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");

module.exports = {
    name: "ping",
    aliases: ["latency", "p"],
    category: "utility",
    description: "Check bot response time",
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
        const start = Date.now();

        const msg = await ctx.reply("◐ Pinging...");

        const elapsed = Date.now() - start;

        // ─── Quality indicator ──────────────────────
        let quality = "◉ Excellent";
        if (elapsed > 500) quality = "◐ Good";
        if (elapsed > 1500) quality = "○ Slow";
        if (elapsed > 3000) quality = "✗ Very Slow";

        await ctx.api.editMessageText(
            ctx.chat.id,
            msg.message_id,
            `◈ *PONG*\n\n` +
            `▸ Latency  ➤ \`${elapsed} ms\`\n` +
            `▸ Quality  ➤ ${quality}\n` +
            `▸ Status   ➤ ◉ Online\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    }
};