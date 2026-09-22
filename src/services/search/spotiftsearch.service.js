// ──────────────────────────────────────────────────
//  BIGSTACK — SpotifySearch Service
//  Search Spotify tracks across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizers
// ══════════════════════════════════════════════════

// ─── Zellrayy shape ⏤ name/artist/cover ─────────────
function normalizeZellrayy(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        title: item.name || "Unknown",
        artist: item.artist || "Unknown",
        album: item.album || null,
        duration: item.duration || null,
        cover: item.cover || null,
        url: item.spotifyUrl || null
    }));
}

// ─── Nexray shape ⏤ title/thumbnail/url ─────────────
function normalizeNexray(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        title: item.title || "Unknown",
        artist: item.artist || "Unknown",
        album: item.album || null,
        duration: item.duration || null,
        cover: item.thumbnail || null,
        url: item.url || null
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
    const cacheKey = `spotifysearch:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[spotifysearch] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("spotifysearch");
    logger.info(`[spotifysearch] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[spotifysearch] trying ${provider.name}...`);

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

            logger.info(`[spotifysearch] ${provider.name} returned ${results.length} result(s)`);

            await cache.set(cacheKey, result, 900);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[spotifysearch] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All spotifysearch providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };