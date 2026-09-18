// ──────────────────────────────────────────────────
//  BIGSTACK — Stats Tracker
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Tracks command usage:
//  - In-memory buffer (for hourly reports)
//  - MongoDB persistence (for /popular command)
// ──────────────────────────────────────────────────

const CommandStat = require("../database/models/CommandStat");
const scheduler = require("./scheduler");
const logger = require("./logger");

// ─── In-memory buffer (fast, resets after report) ───
const buffer = {
    commands: {},
    users: new Set(),
    downloads: 0,
    errors: 0,
    newUsers: 0,
    startedAt: Date.now()
};

// ══════════════════════════════════════════════════
//  📥 TRACKING FUNCTIONS
// ══════════════════════════════════════════════════

/**
 * Track a command use.
 * Called from userLogger middleware.
 */
async function trackCommand(ctx, { success = true, provider = null, durationMs = 0, error = null } = {}) {
    const command = ctx.commandName || "unknown";
    const userId = String(ctx.from?.id || "unknown");

    // ─── 1. Update in-memory buffer ─────────────────
    buffer.commands[command] = (buffer.commands[command] || 0) + 1;
    buffer.users.add(userId);
    if (!success) buffer.errors++;

    // ─── 2. Forward to scheduler (hourly report) ────
    scheduler.trackCommand(command, userId);

    // ─── 3. Persist to MongoDB (for /popular) ───────
    try {
        await CommandStat.create({
            command,
            category: ctx.commandCategory || null,
            userId,
            username: ctx.from?.username || null,
            firstName: ctx.from?.first_name || null,
            chatId: ctx.chat?.id ? String(ctx.chat.id) : null,
            chatType: ctx.chat?.type || null,
            success,
            provider,
            durationMs,
            errorMessage: error ? String(error.message).slice(0, 500) : null,
            timestamp: new Date()
        });
    } catch (err) {
        // Database failure — don't crash the bot
        logger.warn(`[statsTracker] failed to persist: ${err.message}`);
    }
}

/**
 * Track a successful download.
 */
async function trackDownload(ctx, { provider = null, command = null } = {}) {
    buffer.downloads++;
    buffer.users.add(String(ctx.from?.id || "unknown"));
    scheduler.trackDownload(ctx.from?.id);

    // Note: download is also a command, so it's already tracked via trackCommand
    // This is just for the download counter
}

/**
 * Track an error.
 */
function trackError() {
    buffer.errors++;
    scheduler.trackError();
}

/**
 * Track a new user.
 */
async function trackNewUser(ctx) {
    buffer.newUsers++;
    buffer.users.add(String(ctx.from?.id || "unknown"));
    scheduler.trackNewUser(ctx.from?.id);
}

// ══════════════════════════════════════════════════
//  📊 QUERY FUNCTIONS (for /popular command)
// ══════════════════════════════════════════════════

async function getTopCommands(hours = 24, limit = 10) {
    return CommandStat.getTopCommands(hours, limit);
}

async function getActiveUserCount(hours = 24) {
    return CommandStat.getActiveUserCount(hours);
}

async function getDownloadCount(hours = 24) {
    return CommandStat.getDownloadCount(hours);
}

async function getErrorCount(hours = 24) {
    return CommandStat.getErrorCount(hours);
}

async function getUserStats(userId) {
    return CommandStat.getUserStats(userId);
}

// ══════════════════════════════════════════════════
//  📤 REPORT BUILDER
// ══════════════════════════════════════════════════

async function buildReport(periodLabel = "Hourly Report") {
    const topCommands = Object.entries(buffer.commands)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    return {
        title: periodLabel.toUpperCase(),
        period: periodLabel,
        topCommands,
        activeUsers: buffer.users.size,
        downloads: buffer.downloads,
        errors: buffer.errors,
        newUsers: buffer.newUsers
    };
}

// ─── Reset buffer after report is sent ──────────────
function resetBuffer() {
    buffer.commands = {};
    buffer.users.clear();
    buffer.downloads = 0;
    buffer.errors = 0;
    buffer.newUsers = 0;
    buffer.startedAt = Date.now();
}

// ─── Cleanup old records (called by scheduler) ──────
async function cleanupOldStats(daysOld = 90) {
    try {
        const deleted = await CommandStat.cleanupOld(daysOld);
        if (deleted > 0) {
            logger.info(`[statsTracker] 🧹 deleted ${deleted} old stat records`);
        }
        return deleted;
    } catch (err) {
        logger.warn(`[statsTracker] cleanup failed: ${err.message}`);
        return 0;
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    // Tracking
    trackCommand,
    trackDownload,
    trackError,
    trackNewUser,

    // Queries
    getTopCommands,
    getActiveUserCount,
    getDownloadCount,
    getErrorCount,
    getUserStats,

    // Reports
    buildReport,
    resetBuffer,
    cleanupOldStats
};