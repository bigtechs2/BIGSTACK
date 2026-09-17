// ──────────────────────────────────────────────────
//  BIGSTACK — Pinterest Service
//  Download images / videos from Pinterest
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

// ─── Extract pin ID from URL ────────────────────────
function extractPinId(url) {
    if (!url) return null;
    // Match /pin/123456789 or pin.it/xxx
    const m = url.match(/(?:pinterest\.com\/pin\/(\d+)|pin\.it\/([\w]+))/);
    return m ? m[1] || m[2] : url.split("/").pop().split("?")[0];
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate input ──────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "pinterest") {
        throw new Error("Invalid Pinterest URL");
    }

    const pinId = extractPinId(url);
    if (!pinId) {
        throw new Error("Could not extract Pinterest ID");
    }

    // ─── 2. Check cache ─────────────────────────────
    const cacheKey = `pinterest:${pinId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[pinterest] ✅ cache hit for ${pinId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("pinterest");
    logger.info(`[pinterest] processing ${pinId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[pinterest] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 30000
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

            // ─── Detect type (image / video) ────────
            let type = "image";
            const typePath = provider.fields.type;
            if (typePath) {
                const rawType = getField(data, typePath);
                if (rawType === "video") type = "video";
            }

            // Check if URL is video
            if (downloadUrl.match(/\.(mp4|webm|mov)/i)) {
                type = "video";
            }

            // ─── Build result ───────────────────────
            const result = {
                provider: provider.name,
                type,
                title: getField(data, provider.fields.title) || "Pinterest Pin",
                channel: getField(data, provider.fields.channel) || "Unknown",
                thumbnail: getField(data, provider.fields.thumbnail) || downloadUrl,
                download: downloadUrl,
                pinId,
                raw: data
            };

            // ─── Add gallery arrays if available ────
            const images = getField(data, provider.fields.images);
            const videos = getField(data, provider.fields.videos);
            if (Array.isArray(images) && images.length > 1) result.images = images;
            if (Array.isArray(videos) && videos.length > 0) result.videos = videos;

            logger.info(`[pinterest] ✅ ${provider.name} succeeded: "${result.title}" (${type})`);

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[pinterest] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All pinterest providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };