// ──────────────────────────────────────────────────
//  BIGSTACK — Cache
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const NodeCache = require("node-cache");
const logger = require("./logger");
const branding = require("../config/branding");

// ─── Get cache config ───────────────────────────────
const cacheConfig = branding.cache || { enabled: true, driver: "memory" };

// ─── Is cache enabled? ──────────────────────────────
const isEnabled = cacheConfig.enabled !== false;

// ─── In-memory cache instance ───────────────────────
// Default TTL: 10 minutes (600s). Individual sets override this.
const store = isEnabled
    ? new NodeCache({
          stdTTL: 600,
          checkperiod: 120,
          useClones: false,
          deleteOnExpire: true
      })
    : null;

// ─── Cache statistics ───────────────────────────────
let stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
};

// ─── Get ────────────────────────────────────────────
async function get(key) {
    if (!isEnabled) return null;

    const value = store.get(key);
    if (value === undefined) {
        stats.misses++;
        return null;
    }

    stats.hits++;
    return value;
}

// ─── Set ────────────────────────────────────────────
async function set(key, value, ttl = null) {
    if (!isEnabled) return false;

    const success = ttl ? store.set(key, value, ttl) : store.set(key, value);
    if (success) stats.sets++;
    return success;
}

// ─── Delete ─────────────────────────────────────────
async function del(key) {
    if (!isEnabled) return false;

    const count = store.del(key);
    stats.deletes += count;
    return count > 0;
}

// ─── Has ────────────────────────────────────────────
async function has(key) {
    if (!isEnabled) return false;
    return store.has(key);
}

// ─── Flush all ──────────────────────────────────────
async function flush() {
    if (!isEnabled) return;
    store.flushAll();
    logger.info("[cache] flushed all entries");
}

// ─── Get many ───────────────────────────────────────
async function getMany(keys) {
    if (!isEnabled) return {};
    return store.mget(keys);
}

// ─── Set many ───────────────────────────────────────
async function setMany(pairs) {
    if (!isEnabled) return;
    return store.mset(pairs);
}

// ─── Get stats ──────────────────────────────────────
function getStats() {
    const keys = isEnabled ? store.keys().length : 0;
    const total = stats.hits + stats.misses;
    return {
        enabled: isEnabled,
        keys,
        hits: stats.hits,
        misses: stats.misses,
        sets: stats.sets,
        deletes: stats.deletes,
        hitRate: total > 0 ? ((stats.hits / total) * 100).toFixed(1) + "%" : "0%"
    };
}

// ─── Reset stats ────────────────────────────────────
function resetStats() {
    stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
}

// ─── Wrap a function with caching ───────────────────
// Usage: cache.wrap("key", 300, () => fetchData())
async function wrap(key, ttl, fn) {
    const cached = await get(key);
    if (cached !== null) return cached;

    const fresh = await fn();
    await set(key, fresh, ttl);
    return fresh;
}

// ─── Log startup ────────────────────────────────────
if (isEnabled) {
    logger.info(`[cache] enabled (driver: ${cacheConfig.driver || "memory"})`);
} else {
    logger.warn("[cache] disabled");
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    get,
    set,
    del,
    has,
    flush,
    getMany,
    setMany,
    getStats,
    resetStats,
    wrap,
    isEnabled
};