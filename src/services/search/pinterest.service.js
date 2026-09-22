// ──────────────────────────────────────────────────
//  BIGSTACK — PinterestSearch Service
//  Search Pinterest pins across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizers — one per API shape
// ══════════════════════════════════════════════════

// ─── Zellrayy ───────────────────────────────────────
function normalizeZellrayy(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        id: extractId(item.url),
        title: item.title || "",
        image: item.image || null,
        video: item.video || null,
        username: item.username || "unknown",
        fullName: item.fullName || null,
        pinUrl: item.url || null
    }));
}

// ─── Nexray ─────────────────────────────────────────
function normalizeNexray(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        id: item.id || extractId(item.pin),
        title: item.grid_title || item.description || "",
        image: item.images_url || null,
        video: null,
        username: item.pinner?.username || "unknown",
        fullName: item.pinner?.full_name || null,
        pinUrl: item.pin || null
    }));
}

// ─── Azbry ──────────────────────────────────────────
function normalizeAzbry(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        id: item.id || extractId(item.source),
        title: item.title || "",
        image: item.image || null,
        video: null,
        username: item.username || "unknown",
        fullName: null,
        pinUrl: item.source || null
    }));
}

// ─── NeoAPIs ────────────────────────────────────────
function normalizeNeoapis(data) {
    const list = Array.isArray(data.data) ? data.data : [];

    return list.map((item) => ({
        id: item.id || extractId(item.source),
        title: item.title || "",
        image: item.image || null,
        video: null,
        username: item.username || "unknown",
        fullName: null,
        pinUrl: item.source || null
    }));
}

// ─── DavidCyril ─────────────────────────────────────
function normalizeDavidcyril(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        id: extractId(item.source),
        title: item.caption || "",
        image: item.image || null,
        video: null,
        username: item.uploader || "unknown",
        fullName: item.fullName || null,
        pinUrl: item.source || null
    }));
}

// ─── Extract pin ID from URL ────────────────────────
function extractId(url) {
    if (!url) return null;
    const m = String(url).match(/\/pin\/(\d+)/);
    return m ? m[1] : null;
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
    const cacheKey = `pinterestsearch:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[pinterestsearch] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("pinterestsearch");
    logger.info(`[pinterestsearch] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[pinterestsearch] trying ${provider.name}...`);

            const params = { [provider.param]: cleanQuery };
            if (provider.extraParams) Object.assign(params, provider.extraParams);

            const { data } = await axios.get(provider.url, {
                params,
                timeout: provider.timeout || 30000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            let results = [];
            if (provider.shape === "zellrayy")   results = normalizeZellrayy(data);
            if (provider.shape === "nexray")     results = normalizeNexray(data);
            if (provider.shape === "azbry")      results = normalizeAzbry(data);
            if (provider.shape === "neoapis")    results = normalizeNeoapis(data);
            if (provider.shape === "davidcyril") results = normalizeDavidcyril(data);

            // Filter out items without an image
            results = results.filter((r) => r.image);

            if (results.length === 0) {
                throw new Error("No pins found");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                count: results.length,
                results
            };

            logger.info(`[pinterestsearch] ${provider.name} returned ${results.length} pin(s)`);

            await cache.set(cacheKey, result, 900);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[pinterestsearch] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All pinterestsearch providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };