// ──────────────────────────────────────────────────
//  BIGSTACK — Environment Loader
//  © BIGSTACK by bigmanjtech™ with ♥
// ──────────────────────────────────────────────────

const path = require("path");
const chalk = require("chalk");

// ─── Load .env from project root ────────────────────
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

// ─── Define required variables ──────────────────────
const REQUIRED = ["BOT_TOKEN", "OWNER_ID", "MONGO_URL"];

// ─── Validate on startup ────────────────────────────
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(chalk.red("\n❌ Missing required environment variables:"));
    missing.forEach((key) => console.error(chalk.red(`   • ${key}`)));
    console.error(chalk.yellow("\n💡 Fix: Open your .env file and add the missing values.\n"));
    process.exit(1);
}

// ─── Warn about optional but recommended ────────────
const RECOMMENDED = ["JWT_SECRET", "WEBAPP_URL", "NODE_ENV"];
RECOMMENDED.forEach((key) => {
    if (!process.env[key]) {
        console.warn(chalk.yellow(`⚠️  Optional env missing: ${key}`));
    }
});

// ─── Export clean object ────────────────────────────
module.exports = {
    // ─── Telegram ───
    botToken: process.env.BOT_TOKEN,
    ownerId: process.env.OWNER_ID,

    // ─── Database ───
    mongoUrl: process.env.MONGO_URL,

    // ─── Environment ───
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 3000,
    isDev: process.env.NODE_ENV !== "production",
    isProd: process.env.NODE_ENV === "production",

    // ─── WebApp / Mini App ───
    webappUrl: process.env.WEBAPP_URL || "",
    jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
    webappSecret: process.env.WEBAPP_SECRET || "change_me_in_production"
};