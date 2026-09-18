// ──────────────────────────────────────────────────
//  BIGSTACK — Scheduler
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Runs periodic background jobs:
//    • Hourly stats report → STATS group
//    • Daily stats summary → STATS group
//    • Temp file cleanup
//    • Session cleanup
//    • Cache flush
// ──────────────────────────────────────────────────

const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const env = require("../config/env");
const branding = require("../config/branding");
const logger = require("./logger");
const cache = require("./cache");

// ─── Track running jobs (for graceful shutdown) ─────
const jobs = [];

// ─── Check if scheduler is enabled ──────────────────
const statsGroups = branding.logging?.groups?.stats || {};
const isStatsEnabled = statsGroups.id && branding.logging?.groups?.enabled;
const statsInterval = statsGroups.interval || "hourly";

// ─── Stats accumulator (in-memory, resets on send) ──
const statsBuffer = {
    commands: {},     // { "play": 45, "ytmp3": 32 }
    users: new Set(), // unique user IDs
    downloads: 0,
    errors: 0,
    newUsers: 0,
    startedAt: Date.now()
};

// ══════════════════════════════════════════════════
//  📊 STATS BUFFER — called by other modules
// ══════════════════════════════════════════════════

function trackCommand(name, userId) {
    if (!name) return;
    statsBuffer.commands[name] = (statsBuffer.commands[name] || 0) + 1;
    if (userId) statsBuffer.users.add(String(userId));
}

function trackDownload(userId) {
    statsBuffer.downloads++;
    if (userId) statsBuffer.users.add(String(userId));
}

function trackError() {
    statsBuffer.errors++;
}

function trackNewUser(userId) {
    statsBuffer.newUsers++;
    if (userId) statsBuffer.users.add(String(userId));
}

// ══════════════════════════════════════════════════
//  📤 SEND STATS REPORT
// ══════════════════════════════════════════════════

async function sendStatsReport(periodLabel) {
    if (!isStatsEnabled) return;

    // Snapshot current buffer
    const topCommands = Object.entries(statsBuffer.commands)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count }))
        .slice(0, 10);

    const activeUsers = statsBuffer.users.size;

    // Skip if nothing happened
    const totalCommands = Object.values(statsBuffer.commands).reduce((a, b) => a + b, 0);
    if (totalCommands === 0 && statsBuffer.downloads === 0 && statsBuffer.errors === 0) {
        logger.info(`[scheduler] ${periodLabel} report skipped — no activity`);
        return;
    }

    const report = {
        title: periodLabel.toUpperCase(),
        period: periodLabel,
        topCommands,
        activeUsers,
        downloads: statsBuffer.downloads,
        errors: statsBuffer.errors,
        newUsers: statsBuffer.newUsers
    };

    try {
        await logger.stats(report);
        logger.info(`[scheduler] ✅ ${periodLabel} report sent to STATS group`);
    } catch (err) {
        logger.warn(`[scheduler] ❌ Failed to send ${periodLabel} report: ${err.message}`);
    }

    // Reset buffer
    statsBuffer.commands = {};
    statsBuffer.users.clear();
    statsBuffer.downloads = 0;
    statsBuffer.errors = 0;
    statsBuffer.newUsers = 0;
    statsBuffer.startedAt = Date.now();
}

// ══════════════════════════════════════════════════
//  🧹 CLEANUP JOBS
// ══════════════════════════════════════════════════

// ─── Clean temp files older than X hours ────────────
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

// ─── Rotate log files (truncate if too large) ───────
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
                // Truncate — keep last 1000 lines is complex, so just truncate
                fs.writeFileSync(filePath, "");
                logger.info(`[scheduler] 📄 rotated log: ${file}`);
            }
        }
    } catch (err) {
        logger.warn(`[scheduler] log rotation failed: ${err.message}`);
    }
}

// ─── Flush expired cache entries ────────────────────
async function flushCache() {
    try {
        const stats = cache.getStats();
        // Node-cache auto-expires; this just logs the size
        logger.debug(`[scheduler] cache stats: ${stats.keys} keys, hit rate ${stats.hitRate}`);
    } catch (err) {
        logger.warn(`[scheduler] cache flush check failed: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  ⏰ JOB REGISTRATION
// ══════════════════════════════════════════════════

function registerJob(name, schedule, fn) {
    try {
        const job = cron.schedule(schedule, async () => {
            try {
                await fn();
            } catch (err) {
                logger.error(`[scheduler] job "${name}" failed: ${err.message}`);
            }
        });

        jobs.push({ name, job });
        logger.info(`[scheduler] ✅ registered: ${name} (${schedule})`);
        return true;
    } catch (err) {
        logger.error(`[scheduler] ❌ failed to register "${name}": ${err.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════════
//  🚀 START SCHEDULER
// ══════════════════════════════════════════════════

function start() {
    logger.info("─────────────────────────────────────────────");
    logger.info("[scheduler] starting background jobs...");

    // ─── Hourly stats report (default) ──────────────
    if (isStatsEnabled) {
        if (statsInterval === "hourly") {
            registerJob("hourly-stats", "0 * * * *", () => sendStatsReport("Hourly Report"));
        } else if (statsInterval === "daily") {
            registerJob("daily-stats", "0 0 * * *", () => sendStatsReport("Daily Report"));
        } else if (statsInterval === "both") {
            registerJob("hourly-stats", "0 * * * *", () => sendStatsReport("Hourly Report"));
            registerJob("daily-stats", "0 0 * * *", () => sendStatsReport("Daily Report"));
        }
    }

    // ─── Temp file cleanup — every 30 minutes ───────
    registerJob("cleanup-temp", "*/30 * * * *", cleanTempFiles);

    // ─── Log rotation — every 6 hours ───────────────
    registerJob("rotate-logs", "0 */6 * * *", rotateLogs);

    // ─── Cache stats check — every hour ─────────────
    registerJob("cache-check", "15 * * * *", flushCache);

    logger.info(`[scheduler] ✅ ${jobs.length} job(s) running`);
    logger.info("─────────────────────────────────────────────");
}

// ══════════════════════════════════════════════════
//  🛑 STOP SCHEDULER
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
    // Trackers (called by other modules)
    trackCommand,
    trackDownload,
    trackError,
    trackNewUser,
    // Manual trigger (for testing)
    sendStatsReport
};