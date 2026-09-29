// ──────────────────────────────────────────────────
//  BIGSTACK — Pinterest Service
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

// ─── Extract pin ID ─────────────────────────────────
function extractPinId(url) {
    if (!url) return null;
    const m = url.match(/pinterest\.com\/pin\/(\d+)/);
    return m ? m[1] : url.split("/").filter(Boolean).pop().split("?")[0];
}

// ─── Detect type (image/video) ──────────────────────
function detectType(url) {
    if (!url) return "image";
    if (url.match(/\.(mp4|webm|mov)/i)) return "video";
    return "image";
}

// ══════════════════════════════════════════════════
//  Main download function
// ══════════════════════════════════════════════════
async function download(url) {
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "pinterest") {
        throw new Error("Invalid Pinterest URL");
    }

    const pinId = extractPinId(url);
    if (!pinId) throw new Error("Could not extract Pinterest ID");

    // ─── Cache check ────────────────────────────────
    const cacheKey = `pinterest:${pinId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[pinterest] ✓ cache hit for ${pinId}`);
        return cached;
    }

    const providers = config.getProviders("pinterest");
    logger.info(`[pinterest] processing ${pinId} across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[pinterest] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 45000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            // ─── Success check ──────────────────────
            const successPath = provider.fields?.success;
            const isSuccess = successPath ? getField(data, successPath) : true;
            if (!isSuccess) throw new Error("Response reported failure");

            // ─── Extract download URL ───────────────
            const downloadUrl = getField(data, provider.fields.download);
            if (!downloadUrl) throw new Error("No download URL in response");

            // ─── Build result ───────────────────────
            const result = {
                provider: provider.name,
                type: detectType(downloadUrl),
                title: getField(data, provider.fields.title) || "Pinterest Pin",
                channel: getField(data, provider.fields.channel) || "Unknown",
                thumbnail: getField(data, provider.fields.thumbnail) || downloadUrl,
                download: downloadUrl,
                pinId,
                raw: data
            };

            logger.info(`[pinterest] ✓ ${provider.name} succeeded (${result.type})`);

            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[pinterest] ✗ ${provider.name}: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All pinterest providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };