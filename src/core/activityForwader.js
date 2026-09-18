// ──────────────────────────────────────────────────
//  BIGSTACK — Activity Forwarder
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Thin wrapper around logger.activity().
//  Central place for user activity events.
// ──────────────────────────────────────────────────

const logger = require("./logger");
const config = require("../config");

// ─── Check if activity forwarding is enabled ────────
function isEnabled() {
    return config.logging?.groups?.enabled === true &&
           !!config.logging?.groups?.activity?.id;
}

// ─── Check if a specific event type is enabled ──────
function isTypeEnabled(type) {
    if (!isEnabled()) return false;

    const settings = config.logging.groups.activity;

    switch (type) {
        case "new_user": return settings.sendNewUsers !== false;
        case "download": return settings.sendDownloads !== false;
        case "command":  return settings.sendCommands === true;
        default:         return true;
    }
}

// ══════════════════════════════════════════════════
//  📤 FORWARD AN ACTIVITY EVENT
// ══════════════════════════════════════════════════

async function forward(type, data = {}) {
    if (!isTypeEnabled(type)) return false;

    try {
        await logger.activity(type, data);
        return true;
    } catch (err) {
        logger.warn(`[activityForwarder] ${type} failed: ${err.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════════
//  📌 CONVENIENCE WRAPPERS
// ══════════════════════════════════════════════════

// ─── New user joined ────────────────────────────────
async function newUser(ctx) {
    if (!ctx?.from) return false;

    return forward("new_user", {
        name: `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() || "Unknown",
        username: ctx.from.username || null,
        userId: ctx.from.id
    });
}

// ─── Download completed ─────────────────────────────
async function download(ctx, { command, provider, duration, status = "✅ Success" } = {}) {
    if (!ctx?.from) return false;

    return forward("download", {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        command: command || ctx.commandName || "unknown",
        provider: provider || "unknown",
        duration: duration || null,
        status
    });
}

// ─── Command used (optional, may be disabled) ───────
async function command(ctx) {
    if (!ctx?.from) return false;

    return forward("command", {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        command: ctx.commandName || "unknown"
    });
}

// ─── Premium purchase ───────────────────────────────
async function premium(ctx, { plan, price, expiry } = {}) {
    if (!ctx?.from) return false;

    return forward("premium", {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        command: `/premium ${plan || ""}`,
        status: `💰 ${price || "?"} coins · expires ${expiry || "N/A"}`
    });
}

// ─── Referral ───────────────────────────────────────
async function referral(ctx, { referrerId, bonus } = {}) {
    if (!ctx?.from) return false;

    return forward("referral", {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        command: `/start ref_${referrerId || "?"}`,
        coins: `+${bonus || 0} to referrer`
    });
}

// ─── Daily claim ────────────────────────────────────
async function daily(ctx, { coins, newBalance } = {}) {
    if (!ctx?.from) return false;

    return forward("daily", {
        userId: ctx.from.id,
        username: ctx.from.username || null,
        command: "/daily",
        coins: `+${coins || 0} (total: ${newBalance || 0})`
    });
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    forward,
    isEnabled,
    isTypeEnabled,

    // Convenience
    newUser,
    download,
    command,
    premium,
    referral,
    daily
};