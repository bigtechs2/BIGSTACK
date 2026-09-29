// ──────────────────────────────────────────────────
//  BIGSTACK — /report Command
//  Send error reports to bot owner
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "report",
    aliases: ["bug", "feedback", "issue"],
    category: "utility",
    description: "Report a bug or issue to the owner",
    emoji: "◈",
    usage: "<your issue>",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const message = ctx.args.join(" ").trim();

        // ─── No message ⏤ show usage ────────────────
        if (!message) {
            return ctx.reply(
                `◈ REPORT A BUG\n\n` +
                `▸ Usage\n` +
                `   ➤ /report <describe the issue>\n\n` +
                `▸ Example\n` +
                `   ➤ /report /play command fails\n` +
                `     when I search for faded\n\n` +
                `▸ Your report goes directly to the owner.\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Rate limit: 1 report per 5 min ─────────
        const cooldownKey = `report:${ctx.from.id}`;
        const lastReport = await cache.get(cooldownKey);
        if (lastReport) {
            return ctx.reply(
                `◐ *Please wait*\n\n` +
                `▸ You can send another report in a few minutes.`,
                { parse_mode: "Markdown" }
            );
        }

        try {
            // ─── Save cooldown ───────────────────────
            await cache.set(cooldownKey, true, 300);

            // ─── Build report message ────────────────
            const userName = ctx.from.first_name || "Unknown";
            const username = ctx.from.username ? `@${ctx.from.username}` : "no username";
            const chatType = ctx.chat?.type || "unknown";
            const chatId = ctx.chat?.id || "unknown";

            const reportText =
                `◈ *BUG REPORT*\n` +
                `『════════════』\n\n` +
                `👤 From\n` +
                `   ➤ Name: ${userName}\n` +
                `   ➤ Username: ${username}\n` +
                `   ➤ ID: \`${ctx.from.id}\`\n` +
                `   ➤ Chat: ${chatType}\n` +
                `   ➤ Chat ID: \`${chatId}\`\n\n` +
                `📝 *Message*\n` +
                `   ${message}\n\n` +
                `⏰ *Time*\n` +
                `   ➤ ${new Date().toLocaleString("en-GB", { hour12: false })}\n\n` +
                `─────────────────────────────\n` +
                `▸ Reply with /reply ${ctx.from.id} <msg>`;

            // ─── Send to owner ───────────────────────
            let sent = false;

            // Try owner first
            try {
                await ctx.api.sendMessage(config.ownerId, reportText, {
                    parse_mode: "Markdown"
                });
                sent = true;
            } catch (err) {
                logger.warn(`[report] owner DM failed: ${err.message}`);
            }

            // Try errors group as backup
            const errorGroupId = config.logging?.groups?.errors?.id;
            if (!sent && errorGroupId) {
                try {
                    await ctx.api.sendMessage(errorGroupId, reportText, {
                        parse_mode: "Markdown"
                    });
                    sent = true;
                } catch (err) {
                    logger.warn(`[report] group failed: ${err.message}`);
                }
            }

            if (!sent) {
                throw new Error("Could not deliver report");
            }

            // ─── Confirm to user ─────────────────────
            await ctx.reply(
                `✓ *Report Sent*\n\n` +
                `▸ Your message reached the owner.\n` +
                `▸ They'll review and reply if needed.\n\n` +
                `▸ Thank you for helping improve BIGSTACK!\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );

            logger.info(`[/report] ${ctx.from.id}: ${message.slice(0, 50)}`);

        } catch (err) {
            logger.error(`[/report] failed: ${err.message}`);
            await ctx.reply(
                `✗ *Could not send*\n\n` +
                `▸ Please try again in a moment.\n` +
                `▸ Or contact @${config.owner.username}`,
                { parse_mode: "Markdown" }
            );
        }
    }
};