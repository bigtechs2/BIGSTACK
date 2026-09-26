// ──────────────────────────────────────────────────
//  BIGSTACK — NexRay Upload Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const config = require("../../config");
const logger = require("../../core/logger");

async function upload(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error("File not found");
    }

    const providers = config.aiProviders?.upload || [];
    let lastError = null;

    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[upload] trying ${provider.name}...`);

            const form = new FormData();
            form.append("file", fs.createReadStream(filePath));

            const { data } = await axios.post(provider.url, form, {
                headers: form.getHeaders(),
                timeout: provider.timeout || 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const url = data?.result?.url || null;
            if (!url) throw new Error("No upload URL");

            logger.info(`[upload] ✓ ${url}`);
            return { url, provider: provider.name };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[upload] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All upload providers failed");
}

module.exports = { upload };