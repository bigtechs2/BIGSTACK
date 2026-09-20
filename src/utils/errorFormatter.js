// ──────────────────────────────────────────────────
//  BIGSTACK — Error Formatter
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Pure formatting helpers for error messages.
//  No side effects. No Telegram calls. Just text.
// ──────────────────────────────────────────────────

// ─── Escape HTML for Telegram ───────────────────────
function esc(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ─── Format timestamp ───────────────────────────────
function formatTime(date = new Date(), timezone = "UTC") {
    try {
        return date.toLocaleString("en-GB", {
            timeZone: timezone,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    } catch {
        return date.toISOString();
    }
}

// ─── Truncate a string safely ───────────────────────
function truncate(str, max = 500) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max) + "..." : s;
}

// ─── Format stack trace (short version) ─────────────
function formatStack(stack, maxLines = 6) {
    if (!stack) return "";
    const lines = stack.split("\n").slice(0, maxLines);
    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  ERROR REPORT
// ══════════════════════════════════════════════════

function formatError(error, context = {}) {
    const err = error instanceof Error ? error : new Error(String(error));

    const lines = [
        `✗  <b>ERROR REPORT</b>`,
        ``,
        `◈ Where     ➤  <code>${esc(context.command || "unknown")}</code>`,
        `◉ User      ➤  ${esc(context.user || "unknown")}`
    ];

    if (context.chatType) {
        lines.push(`▣ Chat      ➤  ${esc(context.chatType)}`);
    }
    if (context.chatId) {
        lines.push(`⊛ Chat ID   ➤  <code>${esc(context.chatId)}</code>`);
    }

    lines.push(`◐ Time      ➤  <code>${esc(formatTime(new Date(), context.timezone))}</code>`);
    lines.push(``);

    if (context.input) {
        lines.push(`◔ Input     ➤  <code>${esc(truncate(context.input, 200))}</code>`);
    }
    if (context.provider) {
        lines.push(`◕ Provider  ➤  <code>${esc(context.provider)}</code>`);
    }

    lines.push(``);
    lines.push(`◈ Type      ➤  <code>${esc(err.name || "Error")}</code>`);
    lines.push(`◉ Message   ➤  ${esc(truncate(err.message, 400))}`);

    if (err.stack) {
        lines.push(``);
        lines.push(`▸ Stack`);
        lines.push(`<pre>${esc(truncate(formatStack(err.stack), 1500))}</pre>`);
    }

    if (context.metadata && Object.keys(context.metadata).length > 0) {
        lines.push(``);
        lines.push(`▸ Meta`);
        lines.push(`<pre>${esc(truncate(JSON.stringify(context.metadata, null, 2), 500))}</pre>`);
    }

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  ACTIVITY FORMATTER
// ══════════════════════════════════════════════════

const ACTIVITY_ICONS = {
    new_user: "◉  NEW USER",
    download: "◈  DOWNLOAD",
    command:  "▣  COMMAND",
    premium:  "★  PREMIUM",
    referral: "◐  REFERRAL",
    daily:    "◔  DAILY",
    error:    "✗  ERROR"
};

function formatActivity(type, data = {}) {
    const title = ACTIVITY_ICONS[type] || "◈  EVENT";

    const lines = [`<b>${title}</b>`, ``];

    if (data.name)     lines.push(`◉ Name      ➤  ${esc(data.name)}`);
    if (data.username) lines.push(`⊛ Username  ➤  @${esc(data.username)}`);
    if (data.userId)   lines.push(`▣ ID        ➤  <code>${esc(data.userId)}</code>`);
    if (data.command)  lines.push(`◈ Command   ➤  <code>${esc(data.command)}</code>`);
    if (data.input)    lines.push(`◐ Input     ➤  <code>${esc(truncate(data.input, 150))}</code>`);
    if (data.provider) lines.push(`◔ Provider  ➤  <code>${esc(data.provider)}</code>`);
    if (data.status)   lines.push(`◕ Status    ➤  ${esc(data.status)}`);
    if (data.duration) lines.push(`▸ Duration  ➤  ${esc(data.duration)}`);
    if (data.coins)    lines.push(`▩ Coins     ➤  ${esc(data.coins)}`);

    lines.push(``);
    lines.push(`⏱ <code>${esc(formatTime(new Date(), data.timezone))}</code>`);

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  STATS FORMATTER
// ══════════════════════════════════════════════════

function formatStats(report) {
    const lines = [`◈  <b>${esc(report.title || "STATS REPORT")}</b>`, ``];

    if (report.period) lines.push(`◐ Period    ➤  ${esc(report.period)}`);

    if (Array.isArray(report.topCommands) && report.topCommands.length > 0) {
        lines.push(``);
        lines.push(`▸ Top Commands`);
        report.topCommands.slice(0, 10).forEach((c, i) => {
            lines.push(`   ${i + 1}. <code>/${esc(c.name)}</code>  ➤  <b>${esc(c.count)}</b> uses`);
        });
    }

    lines.push(``);
    if (report.totalUsers != null)  lines.push(`◉ Users        ➤  ${esc(report.totalUsers)}`);
    if (report.activeUsers != null) lines.push(`◐ Active       ➤  ${esc(report.activeUsers)}`);
    if (report.downloads != null)   lines.push(`◈ Downloads    ➤  ${esc(report.downloads)}`);
    if (report.errors != null)      lines.push(`✗ Errors       ➤  ${esc(report.errors)}`);
    if (report.newUsers != null)    lines.push(`▣ New Users    ➤  ${esc(report.newUsers)}`);

    lines.push(``);
    lines.push(`⏱ <code>${esc(formatTime(new Date(), report.timezone))}</code>`);

    return lines.join("\n");
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    esc,
    formatTime,
    truncate,
    formatStack,
    formatError,
    formatActivity,
    formatStats
};