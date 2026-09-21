// ──────────────────────────────────────────────────
//  BIGSTACK — ImageSearch Service
//  Search web for images across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Helper: pick random items from array ───────────
function pickRandom(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
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
    const cacheKey = `imagesearch:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[imagesearch] cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── Get providers ──────────────────────────────
    const providers = config.getSearchProviders("imagesearch");
    logger.info(`[imagesearch] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── Try each provider ──────────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[imagesearch] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanQuery },
                timeout: provider.timeout || 20000
            });

            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            const list = Array.isArray(data.result) ? data.result : [];

            if (list.length === 0) {
                throw new Error("No images found");
            }

            // Keep only valid URL strings
            const urls = list.filter((u) => typeof u === "string" && u.startsWith("http"));

            if (urls.length === 0) {
                throw new Error("No valid image URLs");
            }

            const result = {
                provider: provider.name,
                query: cleanQuery,
                count: urls.length,
                urls
            };

            logger.info(`[imagesearch] ${provider.name} returned ${urls.length} image(s)`);

            await cache.set(cacheKey, result, 900);
            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[imagesearch] ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All imagesearch providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search, pickRandom };