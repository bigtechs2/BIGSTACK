// ──────────────────────────────────────────────────
//  BIGSTACK — /alive Command
//  Show bot uptime and system status
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const os = require("os");
const mongoose = require("mongoose");
const config = require("../../config");

// ─── Format uptime ──────────────────────────────────
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

module.exports = {
    name: "alive",
    aliases: ["status", "health", "uptime"],
    category: "utility",
    description: "Show bot uptime and system status",
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
        const uptime = process.uptime();
        const memory = process.memoryUsage();

        // ─── Database status ────────────────────────
        const dbState = mongoose.connection.readyState;
        const dbStatus =
            dbState === 1 ? "◉ Connected" :
            dbState === 0 ? "○ Disconnected" :
            dbState === 2 ? "◐ Connecting" :
            "○ Unknown";

        // ─── CPU load (1 min avg) ───────────────────
        const loadAvg = os.loadavg()[0].toFixed(2);
        const cpuCores = os.cpus().length;
        const loadPercent = ((loadAvg / cpuCores) * 100).toFixed(0);

        // ─── System memory ──────────────────────────
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(0);

        const text =
            `◈ *BIGSTACK STATUS*\n\n` +

            `▸ *Bot*\n` +
            `   ➤ Status   ➤ ◉ Online\n` +
            `   ➤ Uptime   ➤ ${formatUptime(uptime)}\n` +
            `   ➤ Version  ➤ ${config.version}\n\n` +

            `▸ *Process*\n` +
            `   ➤ Node.js  ➤ ${process.version}\n` +
            `   ➤ RAM Used ➤ ${formatBytes(memory.rss)}\n` +
            `   ➤ Heap     ➤ ${formatBytes(memory.heapUsed)}\n\n` +

            `▸ *System*\n` +
            `   ➤ Platform ➤ ${os.platform()} ${os.arch()}\n` +
            `   ➤ CPU      ➤ ${cpuCores} cores\n` +
            `   ➤ Load     ➤ ${loadPercent}%\n` +
            `   ➤ RAM      ➤ ${memPercent}% (${formatBytes(usedMem)} / ${formatBytes(totalMem)})\n\n` +

            `▸ *Database*\n` +
            `   ➤ MongoDB  ➤ ${dbStatus}\n\n` +

            `▸ *Environment*\n` +
            `   ➤ Mode     ➤ ${config.isProd ? "Production" : "Development"}\n` +
            `   ➤ Owner    ➤ @${config.owner.username}\n\n` +

            `▸ ${config.footer}`;

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};