// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Entry Point
//  © BIGSTACK by bigmanjtech™ with ♥
// ──────────────────────────────────────────────────

// ─── Load environment first ─────────────────────────
require("dotenv").config();

// ─── Core modules ───────────────────────────────────
const { Bot } = require("grammy");
const chalk = require("chalk");

// ─── Internal ───────────────────────────────────────
const config = require("./config");
const logger = require("./core/logger");
const { connectDatabase } = require("./database/client");
const { loadCommands } = require("./loader");
const { loadMiddlewares } = require("./middlewares");

// ─── Banner ─────────────────────────────────────────
function printBanner() {
    console.clear();
    console.log(chalk.cyan(`
   ██████╗ ██╗ ██████╗ ███████╗████████╗ █████╗  ██████╗██╗  ██╗
   ██╔══██╗██║██╔════╝ ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
   ██████╔╝██║██║  ███╗███████╗   ██║   ███████║██║     █████╔╝ 
   ██╔══██╗██║██║   ██║╚════██║   ██║   ██╔══██║██║     ██╔═██╗ 
   ██████╔╝██║╚██████╔╝███████║   ██║   ██║  ██║╚██████╗██║  ██╗
   ╚═════╝ ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
    `));
    console.log(chalk.gray(`   ${config.branding.footer}\n`));
    console.log(chalk.green(`   ✦ Starting BIGSTACK v${config.branding.version}...\n`));
}

// ─── Startup sequence ───────────────────────────────
async function start() {
    try {
        // ─── 1. Print banner ────────────────────────
        printBanner();

        // ─── 2. Validate env ────────────────────────
        if (!process.env.BOT_TOKEN) {
            throw new Error("BOT_TOKEN is missing in .env");
        }
        if (!process.env.MONGO_URL) {
            throw new Error("MONGO_URL is missing in .env");
        }

        // ─── 3. Connect to MongoDB ──────────────────
        logger.info("Connecting to database...");
        await connectDatabase();
        logger.info("✅ Database connected");

        // ─── 4. Create bot instance ─────────────────
        const bot = new Bot(process.env.BOT_TOKEN);
        logger.info(`✅ Bot instance created (@${config.bot.username})`);

        // ─── 5. Load middlewares ────────────────────
        loadMiddlewares(bot);
        logger.info("✅ Middlewares loaded");

        // ─── 6. Load commands ───────────────────────
        await loadCommands(bot);
        logger.info("✅ Commands loaded");

        // ─── 7. Set bot commands in Telegram ────────
        // (registered separately via scripts/setCommands.js)
        // await bot.api.setMyCommands(config.bot.commands);

        // ─── 8. Start polling ───────────────────────
        bot.start({
            onStart: (botInfo) => {
                logger.info(`🚀 BIGSTACK is online as @${botInfo.username}`);
                logger.info(`👑 Owner: ${config.owner.username}`);
                logger.info(`📦 Version: ${config.branding.version}`);
            }
        });

        // ─── 9. Graceful shutdown ───────────────────
        setupShutdownHandlers(bot);

    } catch (err) {
        console.error(chalk.red("❌ Failed to start BIGSTACK:"));
        console.error(chalk.red(err.message));
        if (err.stack) console.error(chalk.gray(err.stack));
        process.exit(1);
    }
}

// ─── Graceful shutdown ──────────────────────────────
function setupShutdownHandlers(bot) {
    const shutdown = async (signal) => {
        logger.warn(`\n⚠️  ${signal} received. Shutting down BIGSTACK...`);

        try {
            await bot.stop();
            logger.info("✅ Bot stopped");
        } catch (e) {
            logger.error("Error stopping bot:", e);
        }

        try {
            const mongoose = require("mongoose");
            await mongoose.connection.close();
            logger.info("✅ Database disconnected");
        } catch (e) {
            logger.error("Error closing database:", e);
        }

        logger.info("👋 Goodbye!");
        process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (err) => {
        logger.error("Unhandled Rejection:", err);
    });
    process.on("uncaughtException", (err) => {
        logger.error("Uncaught Exception:", err);
    });
}

// ─── Ignite 🔥 ──────────────────────────────────────
start();