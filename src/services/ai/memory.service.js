// ──────────────────────────────────────────────────
//  BIGSTACK — AI Memory Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Stores conversation in MongoDB.
//  Returns last N messages for prompt context.
// ──────────────────────────────────────────────────

const AIMemory = require("../../database/models/AIMemory");
const cache = require("../../core/cache");
const logger = require("../../core/logger");

// ─── Config ─────────────────────────────────────────
const CACHE_TTL = 300;         // 5 min cache
const RECENT_LIMIT = 6;        // ← Only last 6 messages (3 pairs)

// ══════════════════════════════════════════════════
//  Get recent conversation
// ══════════════════════════════════════════════════
async function getRecent(userId, limit = RECENT_LIMIT) {
    const cacheKey = `aimem:${userId}`;

    // ─── Try cache ──────────────────────────────────
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // ─── Fetch from DB ──────────────────────────────
    try {
        const messages = await AIMemory.getRecent(userId, limit);

        // ─── Sort oldest to newest ──────────────────
        const ordered = messages
            .slice()
            .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

        await cache.set(cacheKey, ordered, CACHE_TTL);
        return ordered;

    } catch (err) {
        logger.warn(`[memory] fetch failed for ${userId}: ${err.message}`);
        return [];
    }
}

// ══════════════════════════════════════════════════
//  Save a message
// ══════════════════════════════════════════════════
async function save(userId, role, content, options = {}) {
    if (!userId || !role || !content) return;

    try {
        await AIMemory.saveMessage({
            userId: String(userId),
            role,
            content: String(content).slice(0, 3000),
            chatId: options.chatId || null,
            type: options.type || "text",
            provider: options.provider || null,
            mediaUrl: options.mediaUrl || null
        });

        // ─── Invalidate cache ───────────────────────
        await cache.del(`aimem:${userId}`).catch(() => {});

    } catch (err) {
        logger.warn(`[memory] save failed for ${userId}: ${err.message}`);
    }
}

// ══════════════════════════════════════════════════
//  Stats
// ══════════════════════════════════════════════════
async function getStats(userId) {
    try {
        const count = await AIMemory.countForUser(String(userId));
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
        const count = await AIMemory.clearForUser(String(userId));
        await cache.del(`aimem:${userId}`).catch(() => {});
        logger.info(`[memory] cleared ${count} messages for ${userId}`);
        return count;
    } catch (err) {
        logger.warn(`[memory] clear failed: ${err.message}`);
        return 0;
    }
}

module.exports = {
    getRecent,
    save,
    getStats,
    clear,
    RECENT_LIMIT
};