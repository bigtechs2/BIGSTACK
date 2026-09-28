// ──────────────────────────────────────────────────
//  BIGSTACK — Scheduler
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Runs periodic background jobs.
//  Imports statsTracker (one-way).
// ──────────────────────────────────────────────────

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const logger = require("./logger");
const cache = require("./cache");
const statsTracker = require("./statsTracker");
const branding = require("../config/branding");

// ─── Config ─────────────────────────────────────────
const statsGroups = branding.logging?.groups?.stats || {};
const isStatsEnabled = !!(statsGroups.id && branding.logging?.groups?.enabled);
const statsInterval = statsGroups.interval || "hourly";

const jobs = [];

// ══════════════════════════════════════════════════
//  TRACKERS ⏤ delegate to statsTracker
// ══════════════════════════════════════════════════
function trackCommand(name, userId) {
    statsTracker.trackCommand(
        { from: { id: userId }, commandName: name, chat: {} },
        { success: true }
    );
}

function trackDownload(userId) {
    statsTracker.trackDownload({ from: { id: userId } });
}

function trackError() {
    statsTracker.trackError();
}

function trackNewUser(userId) {
    statsTracker.trackNewUser({ from: { id: userId } });
}

// ══════════════════════════════════════════════════
//  STATS REPORT
// ══════════════════════════════════════════════════
async function sendStatsReport(periodLabel = "Hourly Report") {
    if (!isStatsEnabled) return;

    try {
        const report = await statsTracker.buildReport(periodLabel);

        const totalCommands = report.topCommands.reduce((a, c) => a + c.count, 0);
        if (
            totalCommands === 0 &&
            report.downloads === 0 &&
            report.errors === 0 &&
            report.newUsers === 0
        ) {
            logger.debug(`[scheduler] ${periodLabel}: no activity`);
            return;
        }

        await logger.stats(report);
        logger.info(`[scheduler] ✓ ${periodLabel} sent`);

        statsTracker.resetBuffer();
    } catch (err) {
        logger.warn(`[scheduler] ${periodLabel} failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  CLEANUP JOBS
// ══════════════════════════════════════════════════

async function cleanTempFiles() {
    const dirs = [
        path.resolve(__dirname, "../../downloads/temp"),
        path.resolve(__dirname, "../../downloads/audio"),
        path.resolve(__dirname, "../../downloads/video"),
        path.resolve(__dirname, "../../downloads/image")
    ];

    const MAX_AGE_MS = 2 * 60 * 60 * 1000;
    const now = Date.now();
    let deleted = 0;

    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            for (const file of fs.readdirSync(dir)) {
                if (file === ".gitkeep") continue;
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile() && now - stat.mtimeMs > MAX_AGE_MS) {
                        fs.unlinkSync(filePath);
                        deleted++;
                    }
                } catch {}
            }
        } catch (err) {
            logger.warn(`[scheduler] cleanup failed for ${dir}: ${err.message}`);
        }
    }

    if (deleted > 0) {
        logger.info(`[scheduler] cleaned ${deleted} temp file(s)`);
    }
}

async function rotateLogs() {
    const logsDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(logsDir)) return;

    const MAX_LOG_SIZE = 10 * 1024 * 1024;

    try {
        for (const file of fs.readdirSync(logsDir)) {
            if (!file.endsWith(".log")) continue;
            const filePath = path.join(logsDir, file);
            const stat = fs.statSync(filePath);
            if (stat.size > MAX_LOG_SIZE) {
                fs.writeFileSync(filePath, "");
                logger.info(`[scheduler] rotated log: ${file}`);
            }
        }
    } catch (err) {
        logger.warn(`[scheduler] log rotation failed: ${err.message}`);
    }
}

async function checkCache() {
    try {
        const stats = cache.getStats();
        logger.debug(`[scheduler] cache: ${stats.keys} keys`);
    } catch {}
}

async function cleanupDatabase() {
    try {
        const User = require("../database/models/User");
        const expired = await User.expirePremium();
        if (expired > 0) {
            logger.info(`[scheduler] expired premium for ${expired} user(s)`);
        }

        const removed = await statsTracker.cleanupOldStats(90);
        if (removed > 0) {
            logger.info(`[scheduler] removed ${removed} old stat(s)`);
        }
    } catch (err) {
        logger.warn(`[scheduler] DB cleanup failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  REGISTER JOBS
// ══════════════════════════════════════════════════

function registerJob(name, schedule, fn, options = {}) {
    try {
        const job = cron.schedule(
            schedule,
            async () => {
                try {
                    await fn();
                } catch (err) {
                    logger.error(`[scheduler] "${name}" failed: ${err.message}`);
                }
            },
            {
                timezone: options.timezone || branding.bot?.timezone || "UTC"
            }
        );

        jobs.push({ name, job });
        logger.info(`[scheduler] ✓ registered: ${name}`);
        return true;
    } catch (err) {
        logger.error(`[scheduler] ✗ register "${name}": ${err.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════

function start() {
    logger.info("[scheduler] starting...");

    if (isStatsEnabled) {
        if (statsInterval === "hourly" || statsInterval === "both") {
            registerJob("hourly-stats", "0 * * * *", () => sendStatsReport("Hourly Report"));
        }
        if (statsInterval === "daily" || statsInterval === "both") {
            registerJob("daily-stats", "0 0 * * *", () => sendStatsReport("Daily Report"));
        }
    }

    registerJob("cleanup-temp", "*/30 * * * *", cleanTempFiles);
    registerJob("rotate-logs", "0 */6 * * *", rotateLogs);
    registerJob("cache-check", "15 * * * *", checkCache);
    registerJob("db-cleanup", "0 4 * * *", cleanupDatabase);

    logger.info(`[scheduler] ✓ ${jobs.length} job(s) running`);
}

function stop() {
    logger.info("[scheduler] stopping...");
    for (const { name, job } of jobs) {
        try {
            job.stop();
        } catch {}
    }
    jobs.length = 0;
    logger.info("[scheduler] ✓ all jobs stopped");
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    start,
    stop,
    trackCommand,
    trackDownload,
    trackError,
    trackNewUser,
    sendStatsReport
};