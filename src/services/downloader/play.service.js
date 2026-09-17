// ──────────────────────────────────────────────────
//  BIGSTACK — Play Service
//  Search + fetch YouTube audio across providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Helper: nested field access ────────────────────
// getField(obj, "result.audio.url") → obj.result.audio.url
function getField(obj, path) {
    if (!path || !obj) return undefined;
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

// ─── Helper: normalize duration to seconds ──────────
// "1:58" → 118  |  118 → 118  |  "N/A" → 0
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

// ─── Main search function ───────────────────────────
async function search(query) {
    // ─── 1. Validate input ──────────────────────────
    if (!query || typeof query !== "string") {
        throw new Error("Query is required");
    }

    const cleanQuery = query.trim();

    // ─── 2. Check cache first ───────────────────────
    const cacheKey = `play:${cleanQuery.toLowerCase()}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[play] ✅ cache hit for "${cleanQuery}"`);
        return cached;
    }

    // ─── 3. Get providers list ──────────────────────
    const providers = config.getProviders("play");
    logger.info(`[play] searching "${cleanQuery}" across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Loop through providers ──────────────────
    for (const provider of providers) {
        try {
            logger.info(`[play] trying ${provider.name}...`);

            // ─── Call the API ───────────────────────
            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: cleanQuery },
                timeout: provider.timeout || 30000
            });

            // ─── Check success flag ─────────────────
            const successPath = provider.fields.success;
            const isSuccess = successPath ? getField(data, successPath) : true;
            if (!isSuccess) {
                throw new Error("Response reported failure");
            }

            // ─── Extract download URL ───────────────
            const download = getField(data, provider.fields.download);
            if (!download) {
                throw new Error("No download URL in response");
            }

            // ─── Build normalized result ────────────
            const result = {
                provider: provider.name,
                title: getField(data, provider.fields.title) || "Unknown Title",
                channel: getField(data, provider.fields.channel) || "Unknown Channel",
                thumbnail: getField(data, provider.fields.thumbnail) || null,
                duration: normalizeDuration(getField(data, provider.fields.duration)),
                videoUrl: getField(data, provider.fields.videoUrl) || null,
                download,
                raw: data
            };

            logger.info(`[play] ✅ ${provider.name} succeeded: "${result.title}"`);

            // ─── Cache for 10 minutes ───────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.SEARCH);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[play] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    // ─── 5. All providers failed ────────────────────
    throw lastError || new Error("All play providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { search };