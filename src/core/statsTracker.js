// ──────────────────────────────────────────────────
//  BIGSTACK — Stats Tracker
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Tracks command usage:
//  - In-memory buffer (for hourly reports)
//  - MongoDB persistence (for /popular command)
//
//  NOTE: This module does NOT import scheduler
//        to avoid circular dependency.
//        The scheduler imports THIS module.
// ──────────────────────────────────────────────────

const CommandStat = require("../database/models/CommandStat");
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
//  TRACKING FUNCTIONS
// ══════════════════════════════════════════════════

async function trackCommand(ctx, options = {}) {
    const command = ctx?.commandName || "unknown";
    const userId = String(ctx?.from?.id || "unknown");
    const success = options.success !== false;
    const provider = options.provider || null;
    const durationMs = options.durationMs || 0;
    const error = options.error || null;

    // ─── 1. Update in-memory buffer ─────────────────
    buffer.commands[command] = (buffer.commands[command] || 0) + 1;
    buffer.users.add(userId);
    if (!success) buffer.errors++;

    // ─── 2. Persist to MongoDB ──────────────────────
    try {
        await CommandStat.create({
            command,
            category: ctx?.commandCategory || null,
            userId,
            username: ctx?.from?.username || null,
            firstName: ctx?.from?.first_name || null,
            chatId: ctx?.chat?.id ? String(ctx.chat.id) : null,
            chatType: ctx?.chat?.type || null,
            success,
            provider,
            durationMs,
            errorMessage: error ? String(error.message).slice(0, 500) : null,
            timestamp: new Date()
        });
    } catch (err) {
        logger.warn(`[statsTracker] persist failed: ${err.message}`);
    }
}

async function trackDownload(ctx) {
    buffer.downloads++;
    buffer.users.add(String(ctx?.from?.id || "unknown"));
}

function trackError() {
    buffer.errors++;
}

async function trackNewUser(ctx) {
    buffer.newUsers++;
    buffer.users.add(String(ctx?.from?.id || "unknown"));
}

// ══════════════════════════════════════════════════
//  QUERY FUNCTIONS
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
//  REPORT BUILDER
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

function resetBuffer() {
    buffer.commands = {};
    buffer.users.clear();
    buffer.downloads = 0;
    buffer.errors = 0;
    buffer.newUsers = 0;
    buffer.startedAt = Date.now();
}

async function cleanupOldStats(daysOld = 90) {
    try {
        const deleted = await CommandStat.cleanupOld(daysOld);
        if (deleted > 0) {
            logger.info(`[statsTracker] cleaned ${deleted} old records`);
        }
        return deleted;
    } catch (err) {
        logger.warn(`[statsTracker] cleanup failed: ${err.message}`);
        return 0;
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    trackCommand,
    trackDownload,
    trackError,
    trackNewUser,
    getTopCommands,
    getActiveUserCount,
    getDownloadCount,
    getErrorCount,
    getUserStats,
    buildReport,
    resetBuffer,
    cleanupOldStats
};