// ──────────────────────────────────────────────────
//  BIGSTACK — Image Generation Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Extract URL from any provider shape
// ══════════════════════════════════════════════════
function extractUrl(shape, data) {
    if (shape === "dc-image-1") return data?.result?.image || data?.image || null;
    if (shape === "dc-image-2") return typeof data?.result === "string" ? data.result : null;
    if (shape === "dc-image-3") return data?.image_url || null;
    if (shape === "azbry-image") return data?.result?.url || null;
    if (shape === "nexray-image") return data?.result || null;
    return null;
}

// ══════════════════════════════════════════════════
//  Generate an image
// ══════════════════════════════════════════════════
async function generate(prompt) {
    if (!prompt || typeof prompt !== "string") throw new Error("Prompt is required");

    const providers = config.aiProviders?.image || [];
    let lastError = null;

    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[image] trying ${provider.name}...`);

            const params = { [provider.param]: prompt };
            if (provider.extraParams) Object.assign(params, provider.extraParams);

            const { data } = await axios.get(provider.url, {
                params,
                headers: provider.headers || {},
                timeout: provider.timeout || 60000
            });

            const url = extractUrl(provider.shape, data);
            if (!url || !url.startsWith("http")) throw new Error("No valid image URL");

            logger.info(`[image] ✓ ${provider.name}`);
            return { url, provider: provider.name };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[image] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All image providers failed");
}

module.exports = { generate };