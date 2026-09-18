// ──────────────────────────────────────────────────
//  BIGSTACK — Scheduler
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Runs periodic background jobs:
//    • Hourly stats report → STATS group
//    • Daily stats summary → STATS group
//    • Temp file cleanup
//    • Log rotation
//    • Cache monitoring
//    • Premium auto-expire
//    • Command stat cleanup
// ──────────────────────────────────────────────────

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const logger = require("./logger");
const cache = require("./cache");
const statsTracker = require("./statsTracker");
const branding = require("../config/branding");

// ─── Track running jobs (for graceful shutdown) ─────
const jobs = [];

// ─── Read config ────────────────────────────────────
const statsGroups = branding.logging?.groups?.stats || {};
const isStatsEnabled = !!(statsGroups.id && branding.logging?.groups?.enabled);
const statsInterval = statsGroups.interval || "hourly";

// ══════════════════════════════════════════════════
//  📊 TRACKERS — thin wrappers around statsTracker
// ══════════════════════════════════════════════════

function trackCommand(name, userId) {
    statsTracker.trackCommand({ from: { id: userId }, commandName: name, chat: {} }, { success: true });
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
//  📤 SEND STATS REPORT
// ══════════════════════════════════════════════════

async function sendStatsReport(periodLabel = "Hourly Report") {
    if (!isStatsEnabled) return;

    try {
        // Build report from statsTracker's buffer
        const report = await statsTracker.buildReport(periodLabel);

        // Skip empty reports
        const totalCommands = report.topCommands.reduce((a, c) => a + c.count, 0);
        if (
            totalCommands === 0 &&
            report.downloads === 0 &&
            report.errors === 0 &&
            report.newUsers === 0
        ) {
            logger.debug(`[scheduler] ${periodLabel} — no activity, skipping`);
            return;
        }

        // Send to STATS group
        await logger.stats(report);
        logger.info(`[scheduler] ✅ ${periodLabel} sent to STATS group`);

        // Reset the buffer for the next period
        statsTracker.resetBuffer();

    } catch (err) {
        logger.warn(`[scheduler] ❌ ${periodLabel} failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  🧹 CLEANUP JOBS
// ══════════════════════════════════════════════════

// ─── Clean temp files older than 2 hours ────────────
async function cleanTempFiles() {
    const tempDirs = [
        path.resolve(__dirname, "../../downloads/temp"),
        path.resolve(__dirname, "../../downloads/audio"),
        path.resolve(__dirname, "../../downloads/video"),
        path.resolve(__dirname, "../../downloads/image")
    ];

    const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
    const now = Date.now();
    let deleted = 0;

    for (const dir of tempDirs) {
        if (!fs.existsSync(dir)) continue;

        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (file === ".gitkeep") continue;

                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile() && now - stat.mtimeMs > MAX_AGE_MS) {
                        fs.unlinkSync(filePath);
                        deleted++;
                    }
                } catch {
                    // Skip individual file errors
                }
            }
        } catch (err) {
            logger.warn(`[scheduler] cleanup failed for ${dir}: ${err.message}`);
        }
    }

    if (deleted > 0) {
        logger.info(`[scheduler] 🧹 cleaned ${deleted} temp file(s)`);
    }
}

// ─── Rotate log files (truncate if > 10MB) ──────────
async function rotateLogs() {
    const logsDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(logsDir)) return;

    const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10 MB

    try {
        const files = fs.readdirSync(logsDir);
        for (const file of files) {
            if (!file.endsWith(".log")) continue;

            const filePath = path.join(logsDir, file);
            const stat = fs.statSync(filePath);

            if (stat.size > MAX_LOG_SIZE) {
                fs.writeFileSync(filePath, "");
                logger.info(`[scheduler] 📄 rotated log: ${file}`);
            }
        }
    } catch (err) {
        logger.warn(`[scheduler] log rotation failed: ${err.message}`);
    }
}

// ─── Log cache stats ────────────────────────────────
async function checkCache() {
    try {
        const stats = cache.getStats();
        logger.debug(`[scheduler] cache: ${stats.keys} keys, hit rate ${stats.hitRate}`);
    } catch (err) {
        logger.warn(`[scheduler] cache check failed: ${err.message}`);
    }
}

// ─── Expire old premium + clean stats ───────────────
async function cleanupDatabase() {
    try {
        // Expire premium
        const User = require("../database/models/User");
        const expired = await User.expirePremium();
        if (expired > 0) {
            logger.info(`[scheduler] 💎 expired premium for ${expired} user(s)`);
        }

        // Clean old command stats (older than 90 days)
        const removed = await statsTracker.cleanupOldStats(90);
        if (removed > 0) {
            logger.info(`[scheduler] 📊 removed ${removed} old stat record(s)`);
        }
    } catch (err) {
        logger.warn(`[scheduler] DB cleanup failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  ⏰ JOB REGISTRATION
// ══════════════════════════════════════════════════

function registerJob(name, schedule, fn, options = {}) {
    try {
        const job = cron.schedule(
            schedule,
            async () => {
                try {
                    await fn();
                } catch (err) {
                    logger.error(`[scheduler] job "${name}" failed: ${err.message}`);
                }
            },
            {
                timezone: options.timezone || branding.bot?.timezone || "UTC"
            }
        );

        jobs.push({ name, job });
        logger.info(`[scheduler] ✅ registered: ${name} (${schedule})`);
        return true;
    } catch (err) {
        logger.error(`[scheduler] ❌ failed to register "${name}": ${err.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════════
//  🚀 START
// ══════════════════════════════════════════════════

function start() {
    logger.info("─────────────────────────────────────────────");
    logger.info("[scheduler] starting background jobs...");

    // ─── Stats reports ──────────────────────────────
    if (isStatsEnabled) {
        if (statsInterval === "hourly" || statsInterval === "both") {
            registerJob("hourly-stats", "0 * * * *", () => sendStatsReport("Hourly Report"));
        }
        if (statsInterval === "daily" || statsInterval === "both") {
            registerJob("daily-stats", "0 0 * * *", () => sendStatsReport("Daily Report"));
        }
    } else {
        logger.info("[scheduler] stats reports disabled");
    }

    // ─── Cleanup jobs ───────────────────────────────
    registerJob("cleanup-temp", "*/30 * * * *", cleanTempFiles);
    registerJob("rotate-logs", "0 */6 * * *", rotateLogs);
    registerJob("cache-check", "15 * * * *", checkCache);
    registerJob("db-cleanup", "0 4 * * *", cleanupDatabase); // daily at 4 AM

    logger.info(`[scheduler] ✅ ${jobs.length} job(s) running`);
    logger.info("─────────────────────────────────────────────");
}

// ══════════════════════════════════════════════════
//  🛑 STOP
// ══════════════════════════════════════════════════

function stop() {
    logger.info("[scheduler] stopping all jobs...");

    for (const { name, job } of jobs) {
        try {
            job.stop();
            logger.info(`[scheduler] stopped: ${name}`);
        } catch (err) {
            logger.warn(`[scheduler] failed to stop "${name}": ${err.message}`);
        }
    }

    jobs.length = 0;
    logger.info("[scheduler] ✅ all jobs stopped");
}

// ══════════════════════════════════════════════════
//  📊 EXPORT
// ══════════════════════════════════════════════════

module.exports = {
    start,
    stop,

    // Trackers (used by userLogger middleware)
    trackCommand,
    trackDownload,
    trackError,
    trackNewUser,

    // Manual trigger (for /stats command or testing)
    sendStatsReport
};