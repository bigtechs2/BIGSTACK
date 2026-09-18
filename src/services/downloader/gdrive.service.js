// ──────────────────────────────────────────────────
//  BIGSTACK — Google Drive Service
//  Download files from Google Drive
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract Google Drive file ID ───────────────────
function extractFileId(url) {
    if (!url) return null;
    const patterns = [
        /\/file\/d\/([A-Za-z0-9_-]+)/,
        /[?&]id=([A-Za-z0-9_-]+)/,
        /\/d\/([A-Za-z0-9_-]+)/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Parse size string "238 KB" → bytes ─────────────
function parseSize(str) {
    if (!str || typeof str !== "string") return 0;
    const m = str.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
    if (!m) return 0;
    const value = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const multipliers = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
    return Math.round(value * (multipliers[unit] || 1));
}

// ─── Detect type from mimeType / extension ──────────
function detectType(mimeType, filename) {
    if (mimeType) {
        if (mimeType.startsWith("image/")) return "image";
        if (mimeType.startsWith("video/")) return "video";
        if (mimeType.startsWith("audio/")) return "audio";
    }

    const ext = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (!ext) return "file";

    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (["mp4", "mkv", "mov", "avi", "webm", "flv"].includes(ext)) return "video";
    if (["mp3", "m4a", "wav", "flac", "ogg", "aac"].includes(ext)) return "audio";
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
    if (["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "document";

    return "file";
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
function normalizeZellrayy(data) {
    const r = data.result || {};

    const filename = r.filename || "file";
    const sizeBytes = r.sizeBytes || (r.sizeMB ? Math.round(r.sizeMB * 1024 * 1024) : 0);

    return {
        filename,
        size: sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        mimeType: r.mimeType || null,
        type: detectType(r.mimeType, filename),
        download: r.downloadUrl || null
    };
}

// ─── NORMALIZER: Nexray ─────────────────────────────
function normalizeNexray(data) {
    const r = data.result || {};

    const filename = r.name || "file";

    return {
        filename,
        size: 0,
        sizeFormatted: "Unknown",
        mimeType: null,
        type: detectType(null, filename),
        download: r.url || null
    };
}

// ─── NORMALIZER: DavidCyril ─────────────────────────
// Response is FLAT — no result wrapper
function normalizeDavidCyril(data) {
    const filename = data.name || "file";
    const size = parseSize(data.size);

    return {
        filename,
        size,
        sizeFormatted: data.size || formatBytes(size),
        mimeType: data.mimeType || null,
        type: data.type || detectType(data.mimeType, filename),
        download: data.download_link || data.api_download || null
    };
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "gdrive") {
        throw new Error("Invalid Google Drive URL");
    }

    const fileId = extractFileId(url);
    if (!fileId) {
        throw new Error("Could not extract Google Drive file ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `gdrive:${fileId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[gdrive] ✅ cache hit for ${fileId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("gdrive");
    logger.info(`[gdrive] processing ${fileId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[gdrive] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 60000
            });

            // ─── Check success ──────────────────────
            const successPath = provider.fields?.success;
            const isSuccess = successPath
                ? successPath.split(".").reduce((a, k) => a?.[k], data)
                : data?.status;

            if (!isSuccess) {
                throw new Error("Response reported failure");
            }

            // ─── Normalize per provider ─────────────
            let normalized = null;
            if (provider.shape === "zellrayy")   normalized = normalizeZellrayy(data);
            if (provider.shape === "nexray")      normalized = normalizeNexray(data);
            if (provider.shape === "davidcyril")  normalized = normalizeDavidCyril(data);

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
                `[gdrive] ✅ ${provider.name} succeeded: ${result.filename} (${result.sizeFormatted}) [${result.type}]`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[gdrive] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All gdrive providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };