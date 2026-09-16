// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Entry Point
//  © BIGSTACK by bigmanjtech™ with ♥
// ──────────────────────────────────────────────────

// ─── Load environment first ─────────────────────────
require("dotenv").config();

// ─── Core modules ───────────────────────────────────
const chalk = require("chalk");

// ─── Internal ───────────────────────────────────────
const config = require("./config");
const logger = require("./core/logger");
const bot = require("./bot");
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
    console.log(chalk.gray(`   ${config.branding.footer}\n`));
    console.log(chalk.green(`   ✦ Starting BIGSTACK v${config.branding.version}...\n`));
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

        // ─── 4. Load middlewares ────────────────────
        loadMiddlewares(bot);
        logger.info("✅ Middlewares loaded");

        // ─── 5. Load commands ───────────────────────
        await loadCommands(bot);

        // ─── 6. Set bot commands in Telegram ────────
        // (register via scripts/setCommands.js)
        // await bot.api.setMyCommands([...]);

        // ─── 7. Start polling ───────────────────────
        bot.start({
            onStart: (botInfo) => {
                logger.info("─────────────────────────────────────────");
                logger.info(`🚀 BIGSTACK is online as @${botInfo.username}`);
                logger.info(`👑 Owner: ${config.owner.username}`);
                logger.info(`📦 Version: ${config.branding.version}`);
                logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
                logger.info("─────────────────────────────────────────");
            }
        });

        // ─── 8. Graceful shutdown ───────────────────
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

        try {
            await bot.stop();
            logger.info("✅ Bot stopped");
        } catch (e) {
            logger.error("Error stopping bot:", e.message);
        }

        try {
            const mongoose = require("mongoose");
            await mongoose.connection.close();
            logger.info("✅ Database disconnected");
        } catch (e) {
            logger.error("Error closing database:", e.message);
        }

        logger.info("👋 Goodbye!");
        process.exit(0);
    };

    // ─── Signals ───
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // ─── Runtime errors ───
    process.on("unhandledRejection", (reason) => {
        logger.error("💥 Unhandled Rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
        logger.error("💥 Uncaught Exception:", err.message);
        if (err.stack) logger.error(err.stack);
    });
}

// ─── Ignite 🔥 ──────────────────────────────────────
start();