// ──────────────────────────────────────────────────
//  BIGSTACK — TikTok Service
//  Download TikTok videos (no watermark, HD preferred)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract TikTok ID from URL ─────────────────────
function extractVideoId(url) {
    if (!url) return null;
    // Match /video/123456 or vt.tiktok.com/xxx or tiktok.com/@user/video/123
    const patterns = [
        /tiktok\.com\/.*\/video\/(\d+)/,
        /tiktok\.com\/@[^/]+\/video\/(\d+)/,
        /\/video\/(\d+)/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    // Short URL — use last path segment
    const slug = url.split("/").filter(Boolean).pop().split("?")[0];
    return slug || null;
}

// ─── Normalize duration ─────────────────────────────
function normalizeDuration(d) {
    if (!d) return 0;
    if (typeof d === "number") return d;
    if (typeof d === "string") {
        const m = d.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }
    return 0;
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
// Response: { status, result: { hdplay, play, wmplay, duration, cover, author, ... } }
function normalizeZellrayy(data) {
    const r = data.result || {};

    // Prefer hdplay > play > wmplay
    const download = r.hdplay || r.play || r.wmplay;
    if (!download) return null;

    return {
        title: r.title || r.content_desc?.[0] || "TikTok Video",
        author: r.author?.nickname || r.author?.unique_id || "Unknown",
        thumbnail: r.cover || r.origin_cover || null,
        duration: normalizeDuration(r.duration),
        download,
        quality: r.hdplay ? "hd" : "sd",
        watermark: !r.hdplay && !r.play,
        videoUrl: `https://www.tiktok.com/@${r.author?.unique_id || "user"}/video/${r.id}`
    };
}

// ─── NORMALIZER: Azbry ──────────────────────────────
// Response: { status, result: { title, author, thumbnail, duration, links: [hd, sd, wm] } }
function normalizeAzbry(data) {
    const r = data.result || {};
    const links = Array.isArray(r.links) ? r.links : [];

    // links[0]=hdplay, links[1]=play, links[2]=wmplay
    const download = links[0] || links[1] || links[2];
    if (!download) return null;

    return {
        title: r.title || "TikTok Video",
        author: r.author || "Unknown",
        thumbnail: r.thumbnail || null,
        duration: normalizeDuration(r.duration),
        download,
        quality: links[0] ? "hd" : links[1] ? "sd" : "wm",
        watermark: links.length === 3 && !links[0] && !links[1],
        videoUrl: null
    };
}

// ─── NORMALIZER: Nexray ─────────────────────────────
// Response: { status, result: { title, duration, cover, data, author: {...} } }
function normalizeNexray(data) {
    const r = data.result || {};

    const download = r.data || r.nowm || r.hd || r.sd;
    if (!download) return null;

    return {
        title: r.title || "TikTok Video",
        author: r.author?.nickname || r.author?.fullname || "Unknown",
        thumbnail: r.cover || null,
        duration: normalizeDuration(r.duration),
        download,
        quality: "hd",
        watermark: false,
        videoUrl: null
    };
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "tiktok") {
        throw new Error("Invalid TikTok URL");
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error("Could not extract TikTok video ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `tiktok:${videoId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[tiktok] ✅ cache hit for ${videoId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("tiktok");
    logger.info(`[tiktok] processing ${videoId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[tiktok] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 45000
            });

            // ─── Check success ──────────────────────
            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            // ─── Normalize per provider ─────────────
            let normalized = null;
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);
            if (provider.shape === "azbry")    normalized = normalizeAzbry(data);
            if (provider.shape === "nexray")   normalized = normalizeNexray(data);

            if (!normalized?.download) {
                throw new Error("No download URL found");
            }

            // ─── Build final result ─────────────────
            const result = {
                provider: provider.name,
                title: normalized.title,
                author: normalized.author,
                thumbnail: normalized.thumbnail,
                duration: normalized.duration,
                download: normalized.download,
                quality: normalized.quality,
                watermark: normalized.watermark,
                videoUrl: normalized.videoUrl || url,
                videoId,
                format: "mp4",
                raw: data
            };

            logger.info(
                `[tiktok] ✅ ${provider.name} succeeded (${result.quality}${result.watermark ? " wm" : ""}): "${result.title}"`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[tiktok] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All tiktok providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };