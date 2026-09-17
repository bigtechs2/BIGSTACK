// ──────────────────────────────────────────────────
//  BIGSTACK — YTMP4 Service
//  Convert YouTube URL → MP4 video
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

// ─── Helper: normalize duration to seconds ──────────
function normalizeDuration(dur) {
    if (typeof dur === "number") return dur;
    if (!dur || dur === "N/A") return 0;
    if (typeof dur === "string" && dur.includes(":")) {
        const parts = dur.split(":").map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseInt(dur) || 0;
}

// ─── Extract video ID from URL ──────────────────────
function extractVideoId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate input ──────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url)) {
        throw new Error("Unsupported URL");
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        throw new Error("Invalid YouTube URL");
    }

    // ─── 2. Check cache ─────────────────────────────
    const cacheKey = `ytmp4:${videoId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[ytmp4] ✅ cache hit for ${videoId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("ytmp4");
    logger.info(`[ytmp4] processing ${videoId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[ytmp4] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 60000
            });

            // ─── Check success flag ─────────────────
            const successPath = provider.fields.success;
            const isSuccess = successPath ? getField(data, successPath) : true;
            if (!isSuccess) {
                throw new Error("Response reported failure");
            }

            // ─── Get download URL ───────────────────
            const downloadUrl = getField(data, provider.fields.download);
            if (!downloadUrl) {
                throw new Error("No download URL in response");
            }

            // ─── Build normalized result ────────────
            const result = {
                provider: provider.name,
                title: getField(data, provider.fields.title) || "Unknown Title",
                channel: getField(data, provider.fields.channel) || "Unknown",
                thumbnail:
                    getField(data, provider.fields.thumbnail) ||
                    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                duration: normalizeDuration(getField(data, provider.fields.duration)),
                videoUrl:
                    getField(data, provider.fields.videoUrl) ||
                    `https://youtube.com/watch?v=${videoId}`,
                download: downloadUrl,
                format: "mp4",
                videoId,
                raw: data
            };

            logger.info(`[ytmp4] ✅ ${provider.name} succeeded: "${result.title}"`);

            // ─── Cache for 30 minutes ───────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[ytmp4] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All ytmp4 providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };