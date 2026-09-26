// ──────────────────────────────────────────────────
//  BIGSTACK — Vision Service (describe images)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");

async function describe(imageUrl, prompt = "Describe this image in detail.") {
    if (!imageUrl) throw new Error("Image URL required");

    const providers = config.aiProviders?.vision || [];
    let lastError = null;

    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[vision] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: {
                    image: imageUrl,
                    prompt
                },
                headers: provider.headers || {},
                timeout: provider.timeout || 40000
            });

            const description =
                data?.result?.description ||
                data?.description ||
                data?.result ||
                null;

            if (!description) throw new Error("No description");

            logger.info(`[vision] ✓ ${provider.name}`);
            return { description, provider: provider.name };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[vision] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All vision providers failed");
}

module.exports = { describe };