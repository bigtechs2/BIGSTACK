// ──────────────────────────────────────────────────
//  BIGSTACK — SpotifyLyric Service
//  Search lyrics by Spotify track URL
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizer
// ══════════════════════════════════════════════════
function normalizeZellrayy(data) {
    const r = data.result || {};
    const meta = r.metadata || {};
    const lyrics = r.lyrics || {};

    return {
        title: meta.title || "Unknown",
        artist: Array.isArray(meta.artists) ? meta.artists.join(", ") : "Unknown",
        album: meta.album?.name || null,
        durationMs: meta.durationMs || null,
        cover: meta.cover || null,
        lyrics: lyrics.plain || null,
        syncedLyrics: lyrics.synced || null,
        hasSynced: lyrics.hasSynced === true
    };
}

// ══════════════════════════════════════════════════
//  Main search function
// ══════════════════════════════════════════════════
async function search(spotifyUrl) {
    if (!spotifyUrl || typeof spotifyUrl !== "string") {
        throw new Error("Spotify URL is required");
    }

    const cleanUrl = spotifyUrl.trim();

    // ─── Cache check ────────────────────────────────
    const cacheKey = `spotifylyric:${cleanUrl}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[spotifylyric] cache hit for "${cleanUrl}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("spotifylyric");
    logger.info(`[spotifylyric] searching "${cleanUrl}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[spotifylyric] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanUrl },
                timeout: provider.timeout || 20000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            let normalized = null;
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);

            if (!normalized?.lyrics) {
                throw new Error("No lyrics found");
            }

            const result = {
                provider: provider.name,
                url: cleanUrl,
                ...normalized
            };

            logger.info(`[spotifylyric] ${provider.name} found "${result.title}" by ${result.artist}`);

            await cache.set(cacheKey, result, 1800);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[spotifylyric] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All spotifylyric providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };