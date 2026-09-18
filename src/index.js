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

// ─── Startup sequence ───────────────────────────────
async function start() {
    try {
        // ─── 1. Print banner ────────────────────────
        printBanner();

        // ─── 2. Validate env ────────────────────────
        validateEnv();
        logger.info("✅ Environment variables validated");

        // ─── 3. Connect to MongoDB ──────────────────
        logger.info("Connecting to database...");
        await connectDatabase();
        logger.info("✅ Database connected");

        // ─── 4. Attach bot to logger ────────────────
        // Logger needs the bot instance to send to groups
        logger.attachBot(bot);
        logger.info("✅ Logger attached to bot (forwarding enabled)");

        // ─── 5. Load middlewares ────────────────────
        loadMiddlewares(bot);
        logger.info("✅ Middlewares loaded");

        // ─── 6. Load commands ───────────────────────
        await loadCommands(bot);

        // ─── 7. Set bot commands in Telegram ────────
        // (register via scripts/setCommands.js)
        // await bot.api.setMyCommands([...]);

        // ─── 8. Start the scheduler ─────────────────
        scheduler.start();
        logger.info("✅ Scheduler started");

        // ─── 9. Start polling ───────────────────────
        bot.start({
            onStart: (botInfo) => {
                logger.info("─────────────────────────────────────────");
                logger.info(`🚀 BIGSTACK is online as @${botInfo.username}`);
                logger.info(`👑 Owner: ${config.owner.username}`);
                logger.info(`📦 Version: ${config.version}`);
                logger.info(`🌍 Environment: ${config.nodeEnv || "development"}`);
                logger.info(`📊 Forwarding: ${config.logging?.groups?.enabled ? "✅ Enabled" : "❌ Disabled"}`);
                logger.info("─────────────────────────────────────────");

                // ─── Send "bot online" to STATS group ───
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
        console.error(chalk.red("\n❌ Failed to start BIGSTACK:"));
        console.error(chalk.red(`   ${err.message}`));
        if (err.stack && process.env.NODE_ENV === "development") {
            console.error(chalk.gray(err.stack));
        }
        process.exit(1);
    }
}

// ─── Graceful shutdown ──────────────────────────────
function setupShutdownHandlers() {
    const shutdown = async (signal) => {
        logger.warn(`\n⚠️  ${signal} received. Shutting down BIGSTACK...`);

        // ─── 1. Stop scheduler ──────────────────────
        try {
            scheduler.stop();
            logger.info("✅ Scheduler stopped");
        } catch (e) {
            logger.error("Error stopping scheduler:", e.message);
        }

        // ─── 2. Stop bot ────────────────────────────
        try {
            await bot.stop();
            logger.info("✅ Bot stopped");
        } catch (e) {
            logger.error("Error stopping bot:", e.message);
        }

        // ─── 3. Cleanup middlewares ─────────────────
        try {
            const errorHandler = require("./middlewares/errorHandler");
            const userLogger = require("./middlewares/userLogger");
            if (errorHandler.cleanup) errorHandler.cleanup();
            if (userLogger.cleanup) userLogger.cleanup();
            logger.info("✅ Middlewares cleaned up");
        } catch (e) {
            // Silent — not critical
        }

        // ─── 4. Close database ──────────────────────
        try {
            await mongoose.connection.close();
            logger.info("✅ Database disconnected");
        } catch (e) {
            logger.error("Error closing database:", e.message);
        }

        // ─── 5. Notify stats group ──────────────────
        await logger.stats({
            title: "BOT OFFLINE",
            period: new Date().toLocaleString("en-GB", { hour12: false }),
            activeUsers: 0,
            downloads: 0,
            errors: 0
        }).catch(() => {});

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