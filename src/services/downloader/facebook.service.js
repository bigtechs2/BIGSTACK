// ──────────────────────────────────────────────────
//  BIGSTACK — Facebook Service
//  Download Facebook videos (HD preferred)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract Facebook video ID from URL ─────────────
function extractVideoId(url) {
    if (!url) return null;
    // Match facebook.com/.../videos/123 or share/v/xxx or watch?v=123
    const patterns = [
        /facebook\.com\/.*\/videos\/(\d+)/,
        /facebook\.com\/watch\/?\?v=(\d+)/,
        /facebook\.com\/reel\/(\d+)/,
        /fb\.watch\/([\w-]+)/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    // Fallback: use last path segment
    return url.split("/").filter(Boolean).pop().split("?")[0];
}

// ─── NORMALIZER: Azbry ──────────────────────────────
// Response: { status, result: { title, thumbnail, medias: [{ url, quality }] } }
function normalizeAzbry(data) {
    const r = data.result || {};
    const medias = Array.isArray(r.medias) ? r.medias : [];

    // Prefer HD, fall back to SD, then any
    const hd = medias.find((m) => m.quality === "hd");
    const sd = medias.find((m) => m.quality === "sd");
    const best = hd || sd || medias[0];

    if (!best?.url) return null;

    return {
        title: r.title || "Facebook Video",
        thumbnail: r.thumbnail || null,
        download: best.url,
        quality: best.quality || "unknown",
        duration: r.duration ? parseFloat(r.duration) : 0,
        videoUrl: r.url || null
    };
}

// ─── NORMALIZER: Nexray ─────────────────────────────
// Response: { status, result: { title, video_hd, video_sd, audio } }
function normalizeNexray(data) {
    const r = data.result || {};

    const hd = r.video_hd;
    const sd = r.video_sd;
    const best = hd || sd;

    if (!best) return null;

    return {
        title: r.title || "Facebook Video",
        thumbnail: null,
        download: best,
        quality: hd ? "hd" : "sd",
        duration: 0,
        videoUrl: null
    };
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
// Response: { status, result: { title, hd, sd, thumbnail, duration, media: [] } }
function normalizeZellrayy(data) {
    const r = data.result || {};

    const hd = r.hd;
    const sd = r.sd;
    const best = hd || sd;

    if (!best) return null;

    return {
        title: r.title || "Facebook Video",
        thumbnail: r.thumbnail || null,
        download: best,
        quality: hd ? "hd" : "sd",
        duration: typeof r.duration === "number" ? Math.round(r.duration) : 0,
        videoUrl: null
    };
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "facebook") {
        throw new Error("Invalid Facebook URL");
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error("Could not extract Facebook video ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `facebook:${videoId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[facebook] ✅ cache hit for ${videoId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("facebook");
    logger.info(`[facebook] processing ${videoId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[facebook] trying ${provider.name}...`);

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
            if (provider.shape === "azbry")     normalized = normalizeAzbry(data);
            if (provider.shape === "nexray")    normalized = normalizeNexray(data);
            if (provider.shape === "zellrayy")  normalized = normalizeZellrayy(data);

            if (!normalized?.download) {
                throw new Error("No download URL found");
            }

            // ─── Build final result ─────────────────
            const result = {
                provider: provider.name,
                title: normalized.title,
                thumbnail: normalized.thumbnail,
                download: normalized.download,
                quality: normalized.quality,
                duration: normalized.duration,
                videoUrl: normalized.videoUrl || url,
                videoId,
                format: "mp4",
                raw: data
            };

            logger.info(
                `[facebook] ✅ ${provider.name} succeeded (${result.quality}): "${result.title}"`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[facebook] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All facebook providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };