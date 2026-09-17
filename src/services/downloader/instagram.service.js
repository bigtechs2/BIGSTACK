// ──────────────────────────────────────────────────
//  BIGSTACK — Instagram Service
//  Download posts, reels, carousels (multi-item)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract Instagram shortcode from URL ───────────
function extractShortcode(url) {
    if (!url) return null;
    const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : url.split("/").filter(Boolean).pop();
}

// ─── NORMALIZER: Azbry shape ────────────────────────
// Response: { status, type, videos: [], images: [] }
function normalizeAzbry(data) {
    const items = [];

    // Videos array
    if (Array.isArray(data.videos)) {
        for (const url of data.videos) {
            items.push({ type: "video", url, thumbnail: data.thumb || null });
        }
    }

    // Images array
    if (Array.isArray(data.images)) {
        for (const img of data.images) {
            const url = typeof img === "string" ? img : img.url;
            items.push({ type: "image", url, thumbnail: url });
        }
    }

    // Single fallback
    if (items.length === 0 && data.url) {
        items.push({ type: data.type || "video", url: data.url, thumbnail: data.thumb });
    }

    return items;
}

// ─── NORMALIZER: Nexray shape ───────────────────────
// Response: { status, result: [{ type, url, thumbnail }] }
function normalizeNexray(data) {
    const items = [];
    const list = Array.isArray(data.result) ? data.result : [data.result];

    for (const item of list) {
        if (!item) continue;
        if (item.url) {
            items.push({
                type: item.type || "video",
                url: item.url,
                thumbnail: item.thumbnail || null
            });
        } else if (item.video) {
            items.push({ type: "video", url: item.video, thumbnail: item.thumbnail });
        } else if (item.image) {
            items.push({ type: "image", url: item.image, thumbnail: item.image });
        }
    }

    return items;
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "instagram") {
        throw new Error("Invalid Instagram URL");
    }

    const shortcode = extractShortcode(url);
    if (!shortcode) {
        throw new Error("Could not extract Instagram shortcode");
    }

    // ─── 2. Check cache ─────────────────────────────
    const cacheKey = `instagram:${shortcode}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[instagram] ✅ cache hit for ${shortcode}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("instagram");
    logger.info(`[instagram] processing ${shortcode} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[instagram] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 45000
            });

            // ─── Check success ──────────────────────
            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            // ─── Normalize based on provider ────────
            let items = [];
            if (provider.shape === "azbry") {
                items = normalizeAzbry(data);
            } else if (provider.shape === "nexray") {
                items = normalizeNexray(data);
            }

            if (items.length === 0) {
                throw new Error("No media items found");
            }

            // ─── Build result ───────────────────────
            const result = {
                provider: provider.name,
                shortcode,
                url,
                items,
                count: items.length,
                type: items.length > 1 ? "carousel" : items[0].type,
                thumbnail: items[0]?.thumbnail || null,
                raw: data
            };

            logger.info(
                `[instagram] ✅ ${provider.name} succeeded: ${result.count} item(s), type=${result.type}`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[instagram] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All instagram providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };