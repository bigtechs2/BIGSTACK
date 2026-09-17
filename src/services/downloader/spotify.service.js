// ──────────────────────────────────────────────────
//  BIGSTACK — Spotify Service
//  Download Spotify tracks from URL
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

// ─── Helper: normalize duration ─────────────────────
function normalizeDuration(dur, inMs = false) {
    if (dur === null || dur === undefined) return 0;
    if (inMs) return Math.round(Number(dur) / 1000);
    if (typeof dur === "number") return dur;
    if (typeof dur === "string" && dur.includes(":")) {
        const parts = dur.split(":").map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseInt(dur) || 0;
}

// ─── Extract Spotify track ID from URL ──────────────
function extractTrackId(url) {
    if (!url) return null;
    const m = url.match(/spotify\.com\/track\/([A-Za-z0-9]+)/);
    return m ? m[1] : null;
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate input ──────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "spotify") {
        throw new Error("Invalid Spotify URL");
    }

    const trackId = extractTrackId(url);
    if (!trackId) {
        throw new Error("Could not extract track ID");
    }

    // ─── 2. Check cache ─────────────────────────────
    const cacheKey = `spotify:${trackId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[spotify] ✅ cache hit for ${trackId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("spotify");
    logger.info(`[spotify] processing ${trackId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[spotify] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 45000
            });

            // ─── Check success ──────────────────────
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

            // ─── Build result ───────────────────────
            const result = {
                provider: provider.name,
                title: getField(data, provider.fields.title) || "Unknown Title",
                channel: getField(data, provider.fields.channel) || "Unknown Artist",
                thumbnail: getField(data, provider.fields.thumbnail) || null,
                duration: normalizeDuration(
                    getField(data, provider.fields.duration),
                    provider.durationInMs === true
                ),
                videoUrl: getField(data, provider.fields.videoUrl) || url,
                download: downloadUrl,
                format: "mp3",
                trackId,
                raw: data
            };

            logger.info(`[spotify] ✅ ${provider.name} succeeded: "${result.title}"`);

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[spotify] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All spotify providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };