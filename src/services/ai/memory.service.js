// ──────────────────────────────────────────────────
//  BIGSTACK — AI Memory Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const AIMemory = require("../../database/models/AIMemory");
const cache = require("../../core/cache");
const logger = require("../../core/logger");

// ─── Cache conversation for 5 min ───────────────────
const CACHE_TTL = 300;
const RECENT_LIMIT = 20;

// ══════════════════════════════════════════════════
//  Get recent conversation (for prompt context)
// ══════════════════════════════════════════════════
async function getRecent(userId, limit = RECENT_LIMIT) {
    const cacheKey = `aimem:${userId}`;

    // ─── Try cache first ─────────────────────────────
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // ─── Fetch from DB ───────────────────────────────
    try {
        const messages = await AIMemory.getRecent(userId, limit);
        await cache.set(cacheKey, messages, CACHE_TTL);
        return messages;
    } catch (err) {
        logger.warn(`[memory] fetch failed for ${userId}: ${err.message}`);
        return [];
    }
}

// ══════════════════════════════════════════════════
//  Save a message
// ══════════════════════════════════════════════════
async function save(userId, role, content, options = {}) {
    try {
        await AIMemory.saveMessage({
            userId,
            role,
            content,
            chatId: options.chatId || null,
            type: options.type || "text",
            provider: options.provider || null,
            mediaUrl: options.mediaUrl || null
        });

        // Invalidate cache so next fetch gets fresh
        await cache.del(`aimem:${userId}`).catch(() => {});
    } catch (err) {
        logger.warn(`[memory] save failed for ${userId}: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  Get stats
// ══════════════════════════════════════════════════
async function getStats(userId) {
    try {
        const count = await AIMemory.countForUser(userId);
        return { messages: count };
    } catch {
        return { messages: 0 };
    }
}

// ══════════════════════════════════════════════════
//  Clear conversation
// ══════════════════════════════════════════════════
async function clear(userId) {
    try {
        const count = await AIMemory.clearForUser(userId);
        await cache.del(`aimem:${userId}`).catch(() => {});
        logger.info(`[memory] cleared ${count} messages for ${userId}`);
        return count;
    } catch (err) {
        logger.warn(`[memory] clear failed: ${err.message}`);
        return 0;
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    getRecent,
    save,
    getStats,
    clear
};