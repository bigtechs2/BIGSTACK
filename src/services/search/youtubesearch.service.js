// ──────────────────────────────────────────────────
//  BIGSTACK — YouTubeSearch Service
//  Search YouTube videos across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Normalizers
// ══════════════════════════════════════════════════

// ─── Zellrayy ───────────────────────────────────────
function normalizeZellrayy(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        videoId: item.videoId || null,
        title: item.title || "Unknown",
        thumbnail: item.thumbnail || null,
        duration: item.duration || null,
        views: item.shortViews || item.views || null,
        channel: item.channel?.name || "Unknown",
        channelUrl: item.channel?.url || null,
        channelAvatar: item.channel?.avatar || null,
        url: item.url || null,
        published: item.published || null,
        isLive: item.isLive === true
    }));
}

// ─── Nexray ─────────────────────────────────────────
function normalizeNexray(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        videoId: item.id || null,
        title: item.title || "Unknown",
        thumbnail: item.image_url || null,
        duration: item.duration || null,
        views: item.views || null,
        channel: item.channel || "Unknown",
        channelUrl: item.channel_url || null,
        channelAvatar: null,
        url: item.url || null,
        published: item.upload_at || null,
        isLive: false
    }));
}

// ─── Azbry ──────────────────────────────────────────
function normalizeAzbry(data) {
    const list = Array.isArray(data.result) ? data.result : [];

    return list.map((item) => ({
        videoId: item.videoId || null,
        title: item.title || "Unknown",
        thumbnail: item.thumbnail || null,
        duration: item.duration || null,
        views: item.views || null,
        channel: null,
        channelUrl: null,
        channelAvatar: null,
        url: item.url || null,
        published: item.uploaded || null,
        isLive: false
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
    const cacheKey = `youtubesearch:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[youtubesearch] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("youtubesearch");
    logger.info(`[youtubesearch] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[youtubesearch] trying ${provider.name}...`);

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
            if (provider.shape === "azbry")    results = normalizeAzbry(data);

            results = results.filter((r) => r.videoId);

            if (results.length === 0) {
                throw new Error("No videos found");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                count: results.length,
                results
            };

            logger.info(`[youtubesearch] ${provider.name} returned ${results.length} video(s)`);

            await cache.set(cacheKey, result, 900);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[youtubesearch] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All youtubesearch providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };