// ──────────────────────────────────────────────────
//  BIGSTACK — Middleware Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Loads all middlewares in the correct order.
//  Order matters:
//    1. errorHandler   — must be FIRST (catches all)
//    2. userLogger     — registers users, tracks stats
//    3. forceJoin      — blocks unjoined users
//    4. permission     — checks owner/admin/premium
//    5. coinGuard      — deducts coins
//    6. rateLimit      — per-user throttle
//    7. language       — loads user's language
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const config = require("../config");

// ══════════════════════════════════════════════════
//  📥 IMPORT MIDDLEWARES
// ══════════════════════════════════════════════════

// ─── Currently built ────────────────────────────────
const errorHandler = require("./errorHandler");
const userLogger = require("./userLogger");

// ─── To build later (uncomment when ready) ──────────
// const forceJoin = require("./forceJoin");
// const permission = require("./permission");
// const coinGuard = require("./coinGuard");
// const rateLimit = require("./rateLimit");
// const language = require("./language");
// const branding = require("./branding");

// ══════════════════════════════════════════════════
//  🔧 REGISTER MIDDLEWARES
// ══════════════════════════════════════════════════

function loadMiddlewares(bot) {
    logger.info("─────────────────────────────────────────────");
    logger.info("[middlewares] loading...");

    // ══════════════════════════════════════════════
    //  1. ERROR HANDLER — MUST BE FIRST
    //  Catches every error from downstream
    // ══════════════════════════════════════════════
    bot.use(errorHandler);
    logger.info("[middlewares] ✅ errorHandler (1st)");

    // ══════════════════════════════════════════════
    //  2. USER LOGGER — registers users, tracks stats
    //  Runs on every message before commands
    // ══════════════════════════════════════════════
    bot.use(userLogger);
    logger.info("[middlewares] ✅ userLogger");

    // ══════════════════════════════════════════════
    //  3. FORCE JOIN — blocks users not in channels
    //  (uncomment when forceJoin.js is built)
    // ══════════════════════════════════════════════
    if (config.forceJoin?.enabled) {
        try {
            const forceJoin = require("./forceJoin");
            bot.use(forceJoin);
            logger.info("[middlewares] ✅ forceJoin");
        } catch {
            logger.warn("[middlewares] ⚠️  forceJoin enabled in config but file missing");
        }
    }

    // ══════════════════════════════════════════════
    //  4. PERMISSION — owner/admin/premium checks
    //  (uncomment when permission.js is built)
    // ══════════════════════════════════════════════
    try {
        const permission = require("./permission");
        bot.use(permission);
        logger.info("[middlewares] ✅ permission");
    } catch {
        // Not built yet — skip silently
    }

    // ══════════════════════════════════════════════
    //  5. COIN GUARD — deducts coins per command
    //  (uncomment when coinGuard.js is built)
    // ══════════════════════════════════════════════
    try {
        const coinGuard = require("./coinGuard");
        bot.use(coinGuard);
        logger.info("[middlewares] ✅ coinGuard");
    } catch {
        // Not built yet
    }

    // ══════════════════════════════════════════════
    //  6. RATE LIMIT — per-user throttle
    //  (uncomment when rateLimit.js is built)
    // ══════════════════════════════════════════════
    try {
        const rateLimit = require("./rateLimit");
        bot.use(rateLimit);
        logger.info("[middlewares] ✅ rateLimit");
    } catch {
        // Not built yet
    }

    // ══════════════════════════════════════════════
    //  7. LANGUAGE — loads user's preferred language
    //  (uncomment when language.js is built)
    // ══════════════════════════════════════════════
    try {
        const language = require("./language");
        bot.use(language);
        logger.info("[middlewares] ✅ language");
    } catch {
        // Not built yet
    }

    logger.info("[middlewares] ✅ all loaded");
    logger.info("─────────────────────────────────────────────");
}

// ══════════════════════════════════════════════════
//  🧹 CLEANUP ALL MIDDLEWARES
// ══════════════════════════════════════════════════

function cleanupMiddlewares() {
    try {
        if (errorHandler.cleanup) errorHandler.cleanup();
        if (userLogger.cleanup) userLogger.cleanup();
        logger.info("[middlewares] ✅ cleaned up");
    } catch (err) {
        logger.warn(`[middlewares] cleanup failed: ${err.message}`);
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    loadMiddlewares,
    cleanupMiddlewares
};