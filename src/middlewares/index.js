// ──────────────────────────────────────────────────
//  BIGSTACK — Middleware Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Loads all middlewares in the correct order.
//  Order matters:
//    1. errorHandler   — must be FIRST (catches all)
//    2. userLogger     — registers users, tracks stats
//    3. menuHandler    — handles menu:* buttons
//    4. phoneListener  — /buy phone input
//    5. forceJoin      — blocks unjoined users
//    6. permission     — checks owner/admin/premium
//    7. coinGuard      — deducts coins
//    8. rateLimit      — per-user throttle
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
    // ══════════════════════════════════════════════
    bot.use(errorHandler);
    logger.info("[middlewares] ✓ errorHandler (1st)");

    // ══════════════════════════════════════════════
    //  2. USER LOGGER
    // ══════════════════════════════════════════════
    bot.use(userLogger);
    logger.info("[middlewares] ✓ userLogger");

    // ══════════════════════════════════════════════
    //  3. MENU HANDLER
    // ══════════════════════════════════════════════
    try {
        const menuHandler = require("./menuHandler");
        bot.use(menuHandler);
        logger.info("[middlewares] ✓ menuHandler");
    } catch (e) {
        logger.warn(`[middlewares] menuHandler not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  4. PHONE LISTENER ⏤ /buy phone input
    // ══════════════════════════════════════════════
    try {
        const phoneListener = require("./phoneListener");
        bot.use(phoneListener);
        logger.info("[middlewares] ✓ phoneListener");
    } catch (e) {
        logger.warn(`[middlewares] phoneListener not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  5. FORCE JOIN
    // ══════════════════════════════════════════════
    if (config.forceJoin?.enabled) {
        try {
            const forceJoin = require("./forceJoin");
            bot.use(forceJoin);
            logger.info("[middlewares] ✓ forceJoin");
        } catch (e) {
            logger.warn(`[middlewares] forceJoin enabled but not loaded: ${e.message}`);
        }
    } else {
        logger.info("[middlewares] ⏤ forceJoin disabled in config");
    }

    // ══════════════════════════════════════════════
    //  6. PERMISSION
    // ══════════════════════════════════════════════
    try {
        const permission = require("./permission");
        bot.use(permission);
        logger.info("[middlewares] ✓ permission");
    } catch (e) {
        logger.warn(`[middlewares] permission not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  7. COIN GUARD
    // ══════════════════════════════════════════════
    try {
        const coinGuard = require("./coinGuard");
        bot.use(coinGuard);
        logger.info("[middlewares] ✓ coinGuard");
    } catch (e) {
        logger.warn(`[middlewares] coinGuard not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  8. RATE LIMIT
    // ══════════════════════════════════════════════
    try {
        const rateLimit = require("./rateLimit");
        bot.use(rateLimit);
        logger.info("[middlewares] ✓ rateLimit");
    } catch (e) {
        logger.warn(`[middlewares] rateLimit not loaded: ${e.message}`);
    }

    // ══════════════════════════════════════════════
    //  9. LANGUAGE (optional ⏤ skip if not built)
    // ══════════════════════════════════════════════
    try {
        const language = require("./language");
        bot.use(language);
        logger.info("[middlewares] ✓ language");
    } catch {
        // Language middleware not built yet ⏤ skip silently
    }

    // ══════════════════════════════════════════════
    //  10. AI LISTENER
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
