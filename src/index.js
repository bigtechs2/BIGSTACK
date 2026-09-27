// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Entry Point
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

// ─── Load environment first ─────────────────────────
require("dotenv").config();

// ─── Core modules ───────────────────────────────────
const chalk = require("chalk");
const mongoose = require("mongoose");

// ─── Internal ───────────────────────────────────────
const config = require("./config");
const logger = require("./core/logger");
const bot = require("./bot");
const scheduler = require("./core/scheduler");
const { connectDatabase } = require("./database/client");
const { loadCommands } = require("./loader");
const { loadMiddlewares } = require("./middlewares");

// ══════════════════════════════════════════════════
//  Global references (for graceful shutdown)
// ══════════════════════════════════════════════════
global.__apiServer = null;

// ─── Banner ─────────────────────────────────────────
function printBanner() {
    console.clear();
    console.log(
        chalk.cyan(`
   ██████╗ ██╗ ██████╗ ███████╗████████╗ █████╗  ██████╗██╗  ██╗
   ██╔══██╗██║██╔════╝ ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
   ██████╔╝██║██║  ███╗███████╗   ██║   ███████║██║     █████╔╝
   ██╔══██╗██║██║   ██║╚════██║   ██║   ██╔══██║██║     ██╔═██╗
   ██████╔╝██║╚██████╔╝███████║   ██║   ██║  ██║╚██████╗██║  ██╗
   ╚═════╝ ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
    `)
    );
    console.log(chalk.gray(`   ${config.footer}\n`));
    console.log(chalk.green(`   ✦ Starting BIGSTACK v${config.version}...\n`));
}

// ─── Validate environment variables ─────────────────
function validateEnv() {
    const required = ["BOT_TOKEN", "OWNER_ID", "MONGO_URL"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing in .env: ${missing.join(", ")}`);
    }
}

// ══════════════════════════════════════════════════
//  STARTUP SEQUENCE
// ══════════════════════════════════════════════════
async function start() {
    try {
        // ─── 1. Print banner ────────────────────────
        printBanner();

        // ─── 2. Validate env ────────────────────────
        validateEnv();
        logger.info("✓ Environment variables validated");

        // ─── 3. Connect to MongoDB ──────────────────
        logger.info("Connecting to database...");
        await connectDatabase();
        logger.info("✓ Database connected");

        // ─── 4. Attach bot to logger ────────────────
        logger.attachBot(bot);
        logger.info("✓ Logger attached to bot (forwarding enabled)");

        // ─── 5. Load middlewares ────────────────────
        loadMiddlewares(bot);
        logger.info("✓ Middlewares loaded");

        // ─── 6. Load commands ───────────────────────
        await loadCommands(bot);

        // ─── 7. Start API server (for webhooks) ─────
        if (config.sonicpesa?.enabled || config.payments?.enabled) {
            try {
                const { startAPI } = require("../api/server");
                const apiPort = Number(process.env.API_PORT) || 3000;
                global.__apiServer = await startAPI(apiPort);
                logger.info(`✓ API webhook server started on port ${apiPort}`);
            } catch (err) {
                logger.warn(`⚠  API server failed: ${err.message}`);
                logger.warn("   Payments via webhook will not work");
            }
        } else {
            logger.info("⏤ API server disabled in config");
        }

        // ─── 8. Start the scheduler ─────────────────
        scheduler.start();
        logger.info("✓ Scheduler started");

        // ─── 9. Start polling ───────────────────────
        bot.start({
            onStart: (botInfo) => {
                logger.info("─────────────────────────────────────────");
                logger.info(`🚀 BIGSTACK is online as @${botInfo.username}`);
                logger.info(`👑 Owner: ${config.owner.username}`);
                logger.info(`📦 Version: ${config.version}`);
                logger.info(`🌍 Environment: ${config.nodeEnv || "development"}`);
                logger.info(`📊 Forwarding: ${config.logging?.groups?.enabled ? "✓ Enabled" : "✗ Disabled"}`);
                logger.info(`💳 Stars: ${config.payments?.starsEnabled ? "✓ Enabled" : "✗ Disabled"}`);
                logger.info(`⚡ USSD Push: ${config.sonicpesa?.enabled ? "✓ Enabled" : "✗ Disabled"}`);
                logger.info("─────────────────────────────────────────");

                // ─── Notify STATS group ───
                logger.stats({
                    title: "BOT ONLINE",
                    period: new Date().toLocaleString("en-GB", { hour12: false }),
                    activeUsers: 0,
                    downloads: 0,
                    errors: 0
                }).catch(() => {});
            }
        });

        // ─── 10. Graceful shutdown ──────────────────
        setupShutdownHandlers();

    } catch (err) {
        console.error(chalk.red("\n✗ Failed to start BIGSTACK:"));
        console.error(chalk.red(`   ${err.message}`));
        if (err.stack && process.env.NODE_ENV === "development") {
            console.error(chalk.gray(err.stack));
        }
        process.exit(1);
    }
}

// ══════════════════════════════════════════════════
//  GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════
function setupShutdownHandlers() {
    let shuttingDown = false;

    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;

        logger.warn(`\n⚠  ${signal} received. Shutting down BIGSTACK...`);

        // ─── 1. Stop API server ─────────────────────
        try {
            if (global.__apiServer) {
                await new Promise((resolve) => {
                    global.__apiServer.close(() => resolve());
                });
                logger.info("✓ API server stopped");
                global.__apiServer = null;
            }
        } catch (e) {
            logger.error("Error stopping API:", e.message);
        }

        // ─── 2. Stop scheduler ──────────────────────
        try {
            scheduler.stop();
            logger.info("✓ Scheduler stopped");
        } catch (e) {
            logger.error("Error stopping scheduler:", e.message);
        }

        // ─── 3. Stop bot ────────────────────────────
        try {
            await bot.stop();
            logger.info("✓ Bot stopped");
        } catch (e) {
            logger.error("Error stopping bot:", e.message);
        }

        // ─── 4. Cleanup middlewares ─────────────────
        try {
            const errorHandler = require("./middlewares/errorHandler");
            const userLogger = require("./middlewares/userLogger");
            if (errorHandler.cleanup) errorHandler.cleanup();
            if (userLogger.cleanup) userLogger.cleanup();
            logger.info("✓ Middlewares cleaned up");
        } catch {
            // Silent ⏤ not critical
        }

        // ─── 5. Close database ──────────────────────
        try {
            await mongoose.connection.close();
            logger.info("✓ Database disconnected");
        } catch (e) {
            logger.error("Error closing database:", e.message);
        }

        // ─── 6. Notify stats group ──────────────────
        try {
            await logger.stats({
                title: "BOT OFFLINE",
                period: new Date().toLocaleString("en-GB", { hour12: false }),
                activeUsers: 0,
                downloads: 0,
                errors: 0
            });
        } catch {
            // Ignore
        }

        logger.info("👋 Goodbye!");
        process.exit(0);
    };

    // ─── Signals ───
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // ─── Runtime errors ───
    process.on("unhandledRejection", (reason) => {
        logger.error(`💥 Unhandled Rejection: ${reason?.message || reason}`);
        if (reason?.stack) logger.debug(reason.stack);
    });

    process.on("uncaughtException", (err) => {
        logger.error(`💥 Uncaught Exception: ${err.message}`);
        if (err.stack) logger.debug(err.stack);
    });
}

// ─── Ignite 🔥 ──────────────────────────────────────
start();