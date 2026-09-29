// ──────────────────────────────────────────────────
//  BIGSTACK — /runtime Command
//  Show detailed runtime info (admin)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const os = require("os");
const mongoose = require("mongoose");
const config = require("../../config");

// ─── Precise uptime with seconds ────────────────────
function formatPreciseUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// ─── Format date ────────────────────────────────────
function formatDate(date) {
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ─── Get process start time ─────────────────────────
function getProcessStartTime() {
    const uptime = process.uptime();
    return new Date(Date.now() - uptime * 1000);
}

module.exports = {
    name: "runtime",
    aliases: ["sysinfo", "system", "proc"],
    category: "utility",
    description: "Show detailed runtime information",
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
        const mem = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // ─── MongoDB stats ──────────────────────────
        const dbState = mongoose.connection.readyState;
        const dbStatus =
            dbState === 1 ? "◉ Connected" :
            dbState === 0 ? "○ Disconnected" :
            dbState === 2 ? "◐ Connecting" :
            "○ Unknown";

        // ─── System load ────────────────────────────
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // ─── Process start ──────────────────────────
        const startTime = getProcessStartTime();

        const text =
            `◈ *RUNTIME INFO*\n\n` +

            `▸ *Process*\n` +
            `   ➤ PID        ➤ \`${process.pid}\`\n` +
            `   ➤ Started    ➤ ${formatDate(startTime)}\n` +
            `   ➤ Uptime     ➤ ${formatPreciseUptime(uptime)}\n` +
            `   ➤ Node.js    ➤ ${process.version}\n` +
            `   ➤ Platform   ➤ ${process.platform}\n` +
            `   ➤ Arch       ➤ ${process.arch}\n\n` +

            `▸ *Memory (process)*\n` +
            `   ➤ RSS        ➤ ${formatBytes(mem.rss)}\n` +
            `   ➤ Heap Used  ➤ ${formatBytes(mem.heapUsed)}\n` +
            `   ➤ Heap Total ➤ ${formatBytes(mem.heapTotal)}\n` +
            `   ➤ External   ➤ ${formatBytes(mem.external)}\n\n` +

            `▸ *CPU*\n` +
            `   ➤ Cores      ➤ ${os.cpus().length}\n` +
            `   ➤ Model      ➤ ${os.cpus()[0]?.model || "Unknown"}\n` +
            `   ➤ Load 1m    ➤ ${loadAvg[0].toFixed(2)}\n` +
            `   ➤ Load 5m    ➤ ${loadAvg[1].toFixed(2)}\n` +
            `   ➤ Load 15m   ➤ ${loadAvg[2].toFixed(2)}\n` +
            `   ➤ User Time  ➤ ${(cpuUsage.user / 1000000).toFixed(2)}s\n` +
            `   ➤ Sys Time   ➤ ${(cpuUsage.system / 1000000).toFixed(2)}s\n\n` +

            `▸ *System Memory*\n` +
            `   ➤ Total      ➤ ${formatBytes(totalMem)}\n` +
            `   ➤ Free       ➤ ${formatBytes(freeMem)}\n` +
            `   ➤ Used       ➤ ${formatBytes(totalMem - freeMem)}\n\n` +

            `▸ *Database*\n` +
            `   ➤ MongoDB    ➤ ${dbStatus}\n` +
            `   ➤ Name       ➤ ${mongoose.connection.name || "N/A"}\n` +
            `   ➤ Host       ➤ ${mongoose.connection.host || "N/A"}\n\n` +

            `▸ *Environment*\n` +
            `   ➤ NODE_ENV   ➤ ${process.env.NODE_ENV || "development"}\n` +
            `   ➤ Bot        ➤ @${config.botUsername || "unknown"}\n` +
            `   ➤ Owner      ➤ @${config.owner.username}\n` +
            `   ➤ Version    ➤ ${config.version}\n\n` +

            `▸ ${config.footer}`;

        await ctx.reply(text, { parse_mode: "Markdown" });
    }
};