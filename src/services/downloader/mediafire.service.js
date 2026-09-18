// ──────────────────────────────────────────────────
//  BIGSTACK — MediaFire Service
//  Download files from MediaFire links
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract MediaFire file ID ──────────────────────
function extractFileId(url) {
    if (!url) return null;
    const m = url.match(/mediafire\.com\/(?:file|file\/premium)\/([A-Za-z0-9]+)/);
    if (m) return m[1];
    return url.split("/").filter(Boolean).pop().split("?")[0];
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Parse size string "1.19MB" → bytes ─────────────
function parseSize(str) {
    if (!str) return 0;
    if (typeof str === "number") return str;
    const m = str.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
    if (!m) return 0;
    const value = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const multipliers = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return Math.round(value * (multipliers[unit] || 1));
}

// ─── Detect type from extension ─────────────────────
function detectType(ext) {
    if (!ext) return "file";
    const e = ext.toLowerCase().replace(/^\./, "");

    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(e)) return "image";
    if (["mp4", "mkv", "mov", "avi", "webm", "flv"].includes(e)) return "video";
    if (["mp3", "m4a", "wav", "flac", "ogg", "aac"].includes(e)) return "audio";
    if (["zip", "rar", "7z", "tar", "gz"].includes(e)) return "archive";
    if (["pdf"].includes(e)) return "pdf";
    if (["doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"].includes(e)) return "document";

    return "file";
}

// ─── NORMALIZER: Azbry ──────────────────────────────
// Response: { status, data: { link, name, filetype, ext, size } }
function normalizeAzbry(data) {
    const d = data.data || {};

    return {
        filename: d.name || "file",
        size: parseSize(d.size),
        sizeFormatted: d.size || "Unknown",
        ext: d.ext || null,
        type: detectType(d.ext),
        filetype: d.filetype || null,
        uploaded: d.uploaded || null,
        download: d.link || null
    };
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
// Response: { status, metadata: { filename, type, size, ext }, download }
function normalizeZellrayy(data) {
    const m = data.metadata || {};

    return {
        filename: m.filename || "file",
        size: parseSize(m.size),
        sizeFormatted: m.size || "Unknown",
        ext: m.ext || null,
        type: detectType(m.ext),
        filetype: m.type || null,
        uploaded: null,
        download: data.download || null
    };
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "mediafire") {
        throw new Error("Invalid MediaFire URL");
    }

    const fileId = extractFileId(url);
    if (!fileId) {
        throw new Error("Could not extract MediaFire file ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `mediafire:${fileId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[mediafire] ✅ cache hit for ${fileId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("mediafire");
    logger.info(`[mediafire] processing ${fileId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[mediafire] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 60000
            });

            // ─── Check success ──────────────────────
            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            // ─── Normalize per provider ─────────────
            let normalized = null;
            if (provider.shape === "azbry")    normalized = normalizeAzbry(data);
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);

            if (!normalized?.download) {
                throw new Error("No download URL found");
            }

            // ─── Build final result ─────────────────
            const result = {
                provider: provider.name,
                fileId,
                ...normalized,
                url,
                raw: data
            };

            logger.info(
                `[mediafire] ✅ ${provider.name} succeeded: ${result.filename} (${result.sizeFormatted}) [${result.type}]`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[mediafire] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All mediafire providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };