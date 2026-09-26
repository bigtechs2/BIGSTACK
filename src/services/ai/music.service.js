// ──────────────────────────────────────────────────
//  BIGSTACK — Music Recognition Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");

async function recognize(audioUrl) {
    if (!audioUrl) throw new Error("Audio URL required");

    const providers = config.aiProviders?.music || [];
    let lastError = null;

    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[music] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: audioUrl },
                timeout: provider.timeout || 30000
            });

            if (!data?.status || !data?.result) throw new Error("No match");

            const r = data.result;

            logger.info(`[music] ✓ ${r.title} by ${r.artist}`);
            return {
                title: r.title || "Unknown",
                artist: r.artist || "Unknown",
                score: r.score || null,
                release: r.release || null,
                duration: r.duration || null,
                links: Array.isArray(r.url) ? r.url : [],
                provider: provider.name
            };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[music] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All music providers failed");
}

module.exports = { recognize };