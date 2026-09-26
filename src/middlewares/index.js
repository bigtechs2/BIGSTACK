// ──────────────────────────────────────────────────
//  BIGSTACK — Middleware Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Loads all middlewares in the correct order.
//  Order matters:
//    1. errorHandler   — must be FIRST (catches all)
//    2. userLogger     — registers users, tracks stats
//    3. menuHandler    — handles menu:* buttons
//    4. forceJoin      — blocks unjoined users
//    5. permission     — checks owner/admin/premium
//    6. coinGuard      — deducts coins
//    7. rateLimit      — per-user throttle
//    8. language       — loads user's language
//    9. aiListener     — catches plain messages for AI
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const config = require("../config");

// ══════════════════════════════════════════════════
//  IMPORT MIDDLEWARES
// ══════════════════════════════════════════════════

const errorHandler = require("./errorHandler");
const userLogger = require("./userLogger");

// ══════════════════════════════════════════════════
//  REGISTER MIDDLEWARES
// ══════════════════════════════════════════════════

function loadMiddlewares(bot) {
    logger.info("─────────────────────────────────────────────");
    logger.info("[middlewares] loading...");

    // ══════════════════════════════════════════════
    //  1. ERROR HANDLER — MUST BE FIRST
    //  Catches every error from downstream
    // ══════════════════════════════════════════════
    bot.use(errorHandler);
    logger.info("[middlewares] ✓ errorHandler (1st)");

    // ══════════════════════════════════════════════
    //  2. USER LOGGER — registers users, tracks stats
    //  Runs on every message before commands
    // ══════════════════════════════════════════════
    bot.use(userLogger);
    logger.info("[middlewares] ✓ userLogger");

    // ══════════════════════════════════════════════
    //  3. MENU HANDLER — handles menu:* buttons
    //  Routes menu taps to category screens.
    // ══════════════════════════════════════════════
    try {
        const menuHandler = require("./menuHandler");
        bot.use(menuHandler);
        logger.info("[middlewares] ✓ menuHandler");
    } catch (e) {
        logger.warn(`[middlewares] menuHandler not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  4. FORCE JOIN — blocks users not in channels
    // ══════════════════════════════════════════════
    if (config.forceJoin?.enabled) {
        try {
            const forceJoin = require("./forceJoin");
            bot.use(forceJoin);
            logger.info("[middlewares] ✓ forceJoin");
        } catch {
            logger.warn("[middlewares] ⚠  forceJoin enabled in config but file missing");
        }
    }

    // ══════════════════════════════════════════════
    //  5. PERMISSION — owner/admin/premium checks
    // ══════════════════════════════════════════════
    try {
        const permission = require("./permission");
        bot.use(permission);
        logger.info("[middlewares] ✓ permission");
    } catch {
        // Not built yet ⏤ skip silently
    }

    // ══════════════════════════════════════════════
    //  6. COIN GUARD — deducts coins per command
    // ══════════════════════════════════════════════
    try {
        const coinGuard = require("./coinGuard");
        bot.use(coinGuard);
        logger.info("[middlewares] ✓ coinGuard");
    } catch {
        // Not built yet
    }

    // ══════════════════════════════════════════════
    //  7. RATE LIMIT — per-user throttle
    // ══════════════════════════════════════════════
    try {
        const rateLimit = require("./rateLimit");
        bot.use(rateLimit);
        logger.info("[middlewares] ✓ rateLimit");
    } catch {
        // Not built yet
    }

    // ══════════════════════════════════════════════
    //  8. LANGUAGE — loads user's preferred language
    // ══════════════════════════════════════════════
    try {
        const language = require("./language");
        bot.use(language);
        logger.info("[middlewares] ✓ language");
    } catch {
        // Not built yet
    }

    // ══════════════════════════════════════════════
    //  9. AI LISTENER — catches plain messages
    //  Runs AFTER all guards, BEFORE commands.
    //  If user has AI ON, this routes their message
    //  to the AI service. If AI is OFF, it passes
    //  through to the command handlers.
    // ══════════════════════════════════════════════
    try {
        const aiListener = require("./aiListener");
        bot.use(aiListener);
        logger.info("[middlewares] ✓ aiListener");
    } catch (e) {
        logger.warn(`[middlewares] aiListener not loaded: ${e.message}`);
    }

    logger.info("[middlewares] ✓ all loaded");
    logger.info("─────────────────────────────────────────────");
}

// ══════════════════════════════════════════════════
//  CLEANUP ALL MIDDLEWARES
// ══════════════════════════════════════════════════

function cleanupMiddlewares() {
    try {
        if (errorHandler.cleanup) errorHandler.cleanup();
        if (userLogger.cleanup) userLogger.cleanup();
        logger.info("[middlewares] ✓ cleaned up");
    } catch (err) {
        logger.warn(`[middlewares] cleanup failed: ${err.message}`);
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    loadMiddlewares,
    cleanupMiddlewares
};