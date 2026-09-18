// ──────────────────────────────────────────────────
//  BIGSTACK — /cancel Command
//  Cancel your active download
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const statusCommand = require("./status");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "cancel",
    aliases: ["stop", "abort"],
    category: "downloader",
    description: "Cancel your active download",
    emoji: "🛑",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    // ─── Command Code ───────────────────────────────
    code: async (ctx) => {
        const userId = String(ctx.from.id);

        // ─── Check if there's an active download ────
        if (!statusCommand.has(userId)) {
            return ctx.reply(
                `🛑 *Cancel*\n\n` +
                    `❌ You have no active download.\n\n` +
                    `💡 Use /status to check.\n\n` +
                    config.footer,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Get info before clearing ───────────────
        const active = statusCommand.activeDownloads.get(userId);

        // ─── Clear it ───────────────────────────────
        statusCommand.end(userId);

        logger.info(`[/cancel] user ${userId} cancelled ${active.command}`);

        // ─── Confirm to user ────────────────────────
        await ctx.reply(
            `🛑 *Download Cancelled*\n\n` +
                `✅ Stopped: \`/${active.command}\`\n` +
                `📝 Input: \`${truncate(active.input, 40)}\`\n\n` +
                `💡 Coins have been refunded (if applicable).\n\n` +
                config.footer,
            { parse_mode: "Markdown" }
        );
    }
};

// ─── Helper ─────────────────────────────────────────
function truncate(str, max = 40) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max) + "..." : s;
}