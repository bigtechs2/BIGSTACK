// ──────────────────────────────────────────────────
//  BIGSTACK — Logger
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const pino = require("pino");
const path = require("path");
const fs = require("fs");
const env = require("../config/env");
const branding = require("../config/branding");

// ─── Ensure logs folder exists ──────────────────────
const logsDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ─── Build pino logger ──────────────────────────────
const logger = pino({
    level: env.isDev ? "debug" : "info",

    transport: env.isDev
        ? {
              target: "pino-pretty",
              options: {
                  colorize: true,
                  translateTime: "HH:MM:ss",
                  ignore: "pid,hostname",
                  messageFormat: "{msg}"
              }
          }
        : undefined,

    ...(env.isProd && {
        destination: path.join(logsDir, "bigstack.log")
    }),

    base: {
        app: branding.branding?.name || "BIGSTACK",
        version: branding.branding?.version || "1.0.0"
    }
});

// ─── Startup marker ─────────────────────────────────
logger.info("─────────────────────────────────────────────");
logger.info(`${branding.branding?.name || "BIGSTACK"} logger initialized`);
logger.info(`Mode: ${env.nodeEnv} | Level: ${env.isDev ? "debug" : "info"}`);
logger.info("─────────────────────────────────────────────");

// ══════════════════════════════════════════════════
//  📡 TELEGRAM BRIDGE
//  Sends logs to your 3 private groups
// ══════════════════════════════════════════════════

// ─── Bot reference (attached at startup) ────────────
let botRef = null;

// ─── Group IDs from config.json ─────────────────────
const groups = branding.logging?.groups || {};
const groupsEnabled = groups.enabled === true;

// ─── Rate limit guard ───────────────────────────────
// Prevent flooding Telegram with too many messages
const rateGuard = {
    errors:   { count: 0, resetAt: Date.now() + 60000, max: 20 },
    activity: { count: 0, resetAt: Date.now() + 60000, max: 30 },
    stats:    { count: 0, resetAt: Date.now() + 60000, max: 5  }
};

function rateOk(bucket) {
    const r = rateGuard[bucket];
    const now = Date.now();
    if (now > r.resetAt) {
        r.count = 0;
        r.resetAt = now + 60000;
    }
    if (r.count >= r.max) return false;
    r.count++;
    return true;
}

// ─── Attach bot instance (called from bot.js) ───────
function attachBot(bot) {
    botRef = bot;
    logger.info("[bridge] ✅ Bot attached to logger — Telegram forwarding enabled");
}

// ─── Send message to a group ────────────────────────
async function sendToGroup(groupId, text, options = {}) {
    if (!botRef) {
        logger.warn("[bridge] Bot not attached yet — skipping Telegram send");
        return false;
    }
    if (!groupsEnabled) return false;

    try {
        await botRef.api.sendMessage(groupId, text, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            ...options
        });
        return true;
    } catch (err) {
        // Don't recurse — just log locally
        logger.warn(`[bridge] ❌ Failed to send to ${groupId}: ${err.message}`);
        return false;
    }
}

// ─── Escape HTML for Telegram ───────────────────────
function esc(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ─── Format a timestamp ─────────────────────────────
function timestamp() {
    return new Date().toLocaleString("en-GB", {
        timeZone: branding.bot?.timezone || "UTC",
        hour12: false
    });
}

// ══════════════════════════════════════════════════
//  🚨 ERROR FORWARDER
// ══════════════════════════════════════════════════

async function errorToGroup(error, context = {}) {
    if (!groupsEnabled) return;
    if (!rateOk("errors")) return;

    const groupId = groups.errors?.id;
    if (!groupId) return;

    const err = error instanceof Error ? error : new Error(String(error));

    const lines = [
        `🚨 <b>ERROR REPORT</b>`,
        ``,
        `📍 <b>Where:</b> <code>${esc(context.command || "unknown")}</code>`,
        `👤 <b>User:</b> ${esc(context.user || "unknown")}`,
        `💬 <b>Chat:</b> ${esc(context.chatType || "unknown")}`,
        `⏰ <b>Time:</b> <code>${timestamp()}</code>`,
        ``
    ];

    if (context.input) {
        lines.push(`💬 <b>Input:</b> <code>${esc(String(context.input).slice(0, 200))}</code>`);
    }

    if (context.provider) {
        lines.push(`📡 <b>Provider:</b> <code>${esc(context.provider)}</code>`);
    }

    lines.push(``);
    lines.push(`📋 <b>Type:</b> <code>${esc(err.name || "Error")}</code>`);
    lines.push(`📝 <b>Message:</b> ${esc(err.message || "no message")}`);

    if (err.stack) {
        lines.push(``);
        lines.push(`🔍 <b>Stack:</b>`);
        lines.push(`<pre>${esc(err.stack.slice(0, 2000))}</pre>`);
    }

    if (context.metadata) {
        lines.push(``);
        lines.push(`📦 <b>Meta:</b>`);
        lines.push(`<pre>${esc(JSON.stringify(context.metadata, null, 2).slice(0, 500))}</pre>`);
    }

    await sendToGroup(groupId, lines.join("\n"));
}

// ══════════════════════════════════════════════════
//  👥 ACTIVITY FORWARDER
// ══════════════════════════════════════════════════

async function activity(type, data = {}) {
    if (!groupsEnabled) return;
    if (!rateOk("activity")) return;

    const groupId = groups.activity?.id;
    if (!groupId) return;

    const settings = groups.activity || {};

    // Respect toggles
    if (type === "new_user" && !settings.sendNewUsers) return;
    if (type === "download" && !settings.sendDownloads) return;
    if (type === "command" && !settings.sendCommands) return;

    const icons = {
        new_user: "👤 NEW USER",
        download: "📥 DOWNLOAD",
        command:  "⚡ COMMAND",
        premium:  "💎 PREMIUM",
        referral: "🎁 REFERRAL",
        daily:    "🪙 DAILY"
    };

    const title = icons[type] || "📌 EVENT";

    const lines = [
        `<b>${title}</b>`,
        ``
    ];

    if (data.name || data.username) {
        lines.push(`👤 <b>Name:</b> ${esc(data.name || "Unknown")}`);
        if (data.username) lines.push(`🔗 <b>Username:</b> @${esc(data.username)}`);
    }

    if (data.userId) lines.push(`🆔 <b>ID:</b> <code>${esc(data.userId)}</code>`);

    if (data.command) lines.push(`💬 <b>Command:</b> <code>${esc(data.command)}</code>`);
    if (data.input)   lines.push(`📝 <b>Input:</b> <code>${esc(String(data.input).slice(0, 150))}</code>`);
    if (data.provider) lines.push(`📡 <b>Provider:</b> <code>${esc(data.provider)}</code>`);
    if (data.status)  lines.push(`📊 <b>Status:</b> ${esc(data.status)}`);
    if (data.duration) lines.push(`⏱ <b>Duration:</b> ${esc(data.duration)}`);

    lines.push(``);
    lines.push(`⏰ <code>${timestamp()}</code>`);

    await sendToGroup(groupId, lines.join("\n"));
}

// ══════════════════════════════════════════════════
//  🏆 STATS FORWARDER
// ══════════════════════════════════════════════════

async function stats(report) {
    if (!groupsEnabled) return;
    if (!rateOk("stats")) return;

    const groupId = groups.stats?.id;
    if (!groupId) return;

    const lines = [
        `🏆 <b>${esc(report.title || "STATS REPORT")}</b>`,
        ``
    ];

    if (report.period) lines.push(`📅 <b>Period:</b> ${esc(report.period)}`);

    if (Array.isArray(report.topCommands)) {
        lines.push(``);
        lines.push(`<b>🔝 Top Commands:</b>`);
        report.topCommands.slice(0, 10).forEach((c, i) => {
            lines.push(`${i + 1}. <code>/${esc(c.name)}</code> — <b>${c.count}</b> uses`);
        });
    }

    lines.push(``);
    if (report.totalUsers != null) lines.push(`👥 <b>Users:</b> ${esc(report.totalUsers)}`);
    if (report.activeUsers != null) lines.push(`⚡ <b>Active:</b> ${esc(report.activeUsers)}`);
    if (report.downloads != null)  lines.push(`📥 <b>Downloads:</b> ${esc(report.downloads)}`);
    if (report.errors != null)     lines.push(`🚨 <b>Errors:</b> ${esc(report.errors)}`);
    if (report.newUsers != null)   lines.push(`👤 <b>New Users:</b> ${esc(report.newUsers)}`);

    lines.push(``);
    lines.push(`⏰ <code>${timestamp()}</code>`);

    await sendToGroup(groupId, lines.join("\n"));
}

// ══════════════════════════════════════════════════
//  📎 ATTACH HELPERS TO LOGGER
// ══════════════════════════════════════════════════

logger.attachBot = attachBot;
logger.errorToGroup = errorToGroup;
logger.activity = activity;
logger.stats = stats;
logger.escape = esc;

// ─── Export ─────────────────────────────────────────
module.exports = logger;