// ──────────────────────────────────────────────────
//  BIGSTACK — /reply Command
//  Owner replies to a bug reporter
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

module.exports = {
    name: "reply",
    aliases: ["answer"],
    category: "utility",
    description: "Reply to a reporter (owner only)",
    emoji: "◈",
    usage: "<user_id> <message>",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const targetId = ctx.args[0];
        const message = ctx.args.slice(1).join(" ");

        if (!targetId || !message) {
            return ctx.reply(
                `◈ *REPLY*\n\n` +
                `▸ Usage: /reply <user_id> <message>\n\n` +
                `▸ Example:\n` +
                `   /reply 8594354663 Fixed! Try again.`,
                { parse_mode: "Markdown" }
            );
        }

        try {
            await ctx.api.sendMessage(
                targetId,
                `◈ *OWNER REPLY*\n\n` +
                `▸ ${message}\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );

            await ctx.reply(`✓ Reply sent to \`${targetId}\``, {
                parse_mode: "Markdown"
            });

            logger.info(`[/reply] owner replied to ${targetId}`);

        } catch (err) {
            logger.error(`[/reply] failed: ${err.message}`);
            await ctx.reply(
                `✗ Could not reply: ${err.message}`,
                { parse_mode: "Markdown" }
            );
        }
    }
};