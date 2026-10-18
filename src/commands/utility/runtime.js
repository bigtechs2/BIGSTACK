// ──────────────────────────────────────────────────
//  BIGSTACK — /runtime Command
//  Shows system runtime info
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const os = require("os");
const process = require("process");
const config = require("../../config");
const logger = require("../../core/logger");

// ─── Safe HTML escape ───────────────────────────────
function esc(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Format uptime ──────────────────────────────────
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
}

module.exports = {
    name: "runtime",
    aliases: ["sysinfo", "system"],
    category: "utility",
    description: "Show system runtime information",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: true,  // Usually owner only
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        logger.info(`[/runtime] ${ctx.from.id}`);

        const mem = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const text =
            `<b>◈ SYSTEM RUNTIME</b>\n\n` +

            `<b>🖥 SYSTEM</b>\n` +
            `▸ OS        ➤ ${esc(os.type())} ${esc(os.release())}\n` +
            `▸ Arch      ➤ ${esc(os.arch())}\n` +
            `▸ Platform  ➤ ${esc(os.platform())}\n` +
            `▸ Hostname  ➤ ${esc(os.hostname())}\n\n` +

            `<b>⚙️ CPU</b>\n` +
            `▸ Cores     ➤ ${os.cpus().length}\n` +
            `▸ Model     ➤ ${esc(os.cpus()[0]?.model || "Unknown")}\n` +
            `▸ Load Avg  ➤ ${os.loadavg().map(n => n.toFixed(2)).join(", ")}\n\n` +

            `<b>💾 MEMORY</b>\n` +
            `▸ Total     ➤ ${formatBytes(totalMem)}\n` +
            `▸ Used      ➤ ${formatBytes(usedMem)}\n` +
            `▸ Free      ➤ ${formatBytes(freeMem)}\n` +
            `▸ Node RSS  ➤ ${formatBytes(mem.rss)}\n` +
            `▸ Heap Used ➤ ${formatBytes(mem.heapUsed)}\n\n` +

            `<b>⏱ PROCESS</b>\n` +
            `▸ Uptime    ➤ ${formatUptime(process.uptime())}\n` +
            `▸ Node      ➤ ${esc(process.version)}\n` +
            `▸ PID       ➤ ${process.pid}\n\n` +

            `<i>${esc(config.footer)}</i>`;

        await ctx.reply(text, { parse_mode: "HTML" });
    }
};