// ──────────────────────────────────────────────────
//  BIGSTACK — /status Command
//  Show current download queue and active tasks
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── In-memory active downloads (per user) ──────────
// Structure: { userId: { command, input, startedAt, provider } }
const activeDownloads = new Map();

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "status",
    aliases: ["queue", "progress"],
    category: "downloader",
    description: "Check your active downloads and queue",
    emoji: "📊",
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
        const active = activeDownloads.get(userId);

        // ─── Nothing active ─────────────────────────
        if (!active) {
            return ctx.reply(
                `📊 *Download Status*\n\n` +
                    `✨ *No active downloads*\n\n` +
                    `You're all caught up!\n\n` +
                    `💡 Use any downloader command to start one.\n\n` +
                    config.footer,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Something active ───────────────────────
        const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
        const elapsedText = formatDuration(elapsed);

        const text =
            `📊 *Download Status*\n\n` +
            `⏳ *Active:*\n` +
            `├ Command: \`/${active.command}\`\n` +
            `├ Input: \`${truncate(active.input, 40)}\`\n` +
            `├ Provider: \`${active.provider || "resolving..."}\`\n` +
            `└ Elapsed: \`${elapsedText}\`\n\n` +
            `💡 Use /cancel to stop it.\n\n` +
            config.footer;

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};

// ══════════════════════════════════════════════════
//  🛠️ HELPERS
// ══════════════════════════════════════════════════

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

function truncate(str, max = 40) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max) + "..." : s;
}

// ══════════════════════════════════════════════════
//  📌 EXPORTS for other modules
// ══════════════════════════════════════════════════

module.exports.activeDownloads = activeDownloads;

// ─── Register an active download ────────────────────
module.exports.start = function (userId, data) {
    activeDownloads.set(String(userId), {
        command: data.command || "unknown",
        input: data.input || "",
        provider: data.provider || null,
        startedAt: Date.now()
    });
};

// ─── Clear an active download ───────────────────────
module.exports.end = function (userId) {
    activeDownloads.delete(String(userId));
};

// ─── Check if user has active download ──────────────
module.exports.has = function (userId) {
    return activeDownloads.has(String(userId));
};