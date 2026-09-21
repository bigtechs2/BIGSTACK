// ──────────────────────────────────────────────────
//  BIGSTACK — Lyrics Service
//  Search song lyrics across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizers
// ══════════════════════════════════════════════════

// ─── Nexray shape ⏤ nested under result.lyrics ──────
function normalizeNexray(data) {
    const r = data.result || {};
    const l = r.lyrics || {};

    return {
        title: l.track_name || l.name || r.title || "Unknown",
        artist: l.artist_name || r.artist || "Unknown",
        album: l.album_name || null,
        duration: l.duration || null,
        thumbnail: r.thumbnail || null,
        lyrics: l.plain_lyrics || null,
        syncedLyrics: l.synced_lyrics || null
    };
}

// ─── Zellrayy shape ⏤ flat under result ─────────────
function normalizeZellrayy(data) {
    const r = data.result || {};

    return {
        title: r.trackName || r.name || "Unknown",
        artist: r.artistName || "Unknown",
        album: r.albumName || null,
        duration: r.duration || null,
        thumbnail: null,
        lyrics: r.plainLyrics || null,
        syncedLyrics: r.syncedLyrics || null
    };
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
    const cacheKey = `lyrics:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[lyrics] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("lyrics");
    logger.info(`[lyrics] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[lyrics] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanQuery },
                timeout: provider.timeout || 20000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            let normalized = null;
            if (provider.shape === "nexray")   normalized = normalizeNexray(data);
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);

            if (!normalized?.lyrics) {
                throw new Error("No lyrics found");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                ...normalized
            };

            logger.info(`[lyrics] ${provider.name} found "${result.title}" by ${result.artist}`);

            await cache.set(cacheKey, result, 1800);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[lyrics] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All lyrics providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };