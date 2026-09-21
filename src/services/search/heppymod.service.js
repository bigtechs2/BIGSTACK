// ──────────────────────────────────────────────────
//  BIGSTACK — HappyMod Service
//  Search HappyMod for APKs across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizers
// ══════════════════════════════════════════════════

// ─── Nexray shape ⏤ rich fields ─────────────────────
function normalizeNexray(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        title: item.title || "Unknown",
        version: item.version || null,
        size: item.size || null,
        modStatus: item.mod_status || null,
        icon: item.icon || null,
        url: item.url || null,
        package: null
    }));
}

// ─── Azbry shape ⏤ flat fields ──────────────────────
function normalizeAzbry(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        title: (item.title || "Unknown").replace(/ Mod Apk.*$/, "").trim(),
        version: null,
        size: null,
        modStatus: null,
        icon: item.icon || null,
        url: item.url || null,
        package: item.package || null
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
    const cacheKey = `happymod:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[happymod] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("happymod");
    logger.info(`[happymod] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[happymod] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanQuery },
                timeout: provider.timeout || 30000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            let results = [];
            if (provider.shape === "nexray") results = normalizeNexray(data);
            if (provider.shape === "azbry")  results = normalizeAzbry(data);

            if (results.length === 0) {
                throw new Error("No APKs found");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                count: results.length,
                results
            };

            logger.info(`[happymod] ${provider.name} returned ${results.length} result(s)`);

            await cache.set(cacheKey, result, 900);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[happymod] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All happymod providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };