// ──────────────────────────────────────────────────
//  BIGSTACK — AppleSearch Service
//  Search Apple Music across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Helper: nested field access ────────────────────
function getField(obj, path) {
    if (!path || !obj) return undefined;
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
function normalizeZellrayy(data) {
    const r = data.result || {};
    const top = Array.isArray(r.topResults) ? r.topResults : [];

    return top.map((item) => ({
        title: item.title || "Unknown",
        subtitle: item.subtitle || "",
        url: item.url || null,
        image: item.image || null,
        explicit: item.explicit === true
    }));
}

// ─── NORMALIZER: Nexray ─────────────────────────────
function normalizeNexray(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        title: item.title || "Unknown",
        subtitle: item.subtitle || "",
        url: item.link || null,
        image: item.image || null,
        explicit: false
    }));
}

// ══════════════════════════════════════════════════
//  Main search function
// ══════════════════════════════════════════════════
async function search(query) {
    if (!query || typeof query !== "string") {
        throw new Error("Query is required");
    }

    const cleanQuery = query.trim();

    // ─── Cache check ────────────────────────────────
    const cacheKey = `applesearch:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[applesearch] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("applesearch");
    logger.info(`[applesearch] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[applesearch] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanQuery },
                timeout: provider.timeout || 30000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            let results = [];
            if (provider.shape === "zellrayy") results = normalizeZellrayy(data);
            if (provider.shape === "nexray")   results = normalizeNexray(data);

            if (results.length === 0) {
                throw new Error("No results found");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                count: results.length,
                results
            };

            logger.info(`[applesearch] ${provider.name} returned ${results.length} result(s)`);

            await cache.set(cacheKey, result, 600);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[applesearch] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All applesearch providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };