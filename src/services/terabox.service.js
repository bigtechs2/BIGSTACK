// ──────────────────────────────────────────────────
//  BIGSTACK — Terabox Service
//  Download files from Terabox share links
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract share ID from Terabox URL ──────────────
function extractShareId(url) {
    if (!url) return null;
    const m = url.match(/\/s\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : url.split("/").filter(Boolean).pop().split("?")[0];
}

// ─── Normalize file item ────────────────────────────
function normalizeFile(item, i) {
    return {
        index: i,
        name: item.name || `file_${i}`,
        path: item.file_path || null,
        size: item.size || 0,
        sizeFormatted: item.size_formatted || formatBytes(item.size),
        type: item.type || "file",           // "image" | "video" | "audio" | "file"
        isDir: item.is_dir === "1" || item.is_dir === true,
        download: item.normal_dlink || item.download_link || null,
        thumbnail: item.thumbnail || null,
        folder: item.folder || "root"
    };
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "terabox") {
        throw new Error("Invalid Terabox URL");
    }

    const shareId = extractShareId(url);
    if (!shareId) {
        throw new Error("Could not extract Terabox share ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `terabox:${shareId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[terabox] ✅ cache hit for ${shareId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("terabox");
    logger.info(`[terabox] processing ${shareId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[terabox] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 60000
            });

            // ─── Check success ──────────────────────
            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            const r = data.result || {};
            const list = Array.isArray(r.list) ? r.list : [];

            if (list.length === 0) {
                throw new Error("No files in share link");
            }

            // ─── Normalize all files ────────────────
            const files = list.map((item, i) => normalizeFile(item, i));

            // ─── Build result ───────────────────────
            const result = {
                provider: provider.name,
                shareId,
                url,
                totalFiles: r.total_files || files.length,
                totalFolders: r.total_folders || 0,
                files,
                raw: data
            };

            logger.info(
                `[terabox] ✅ ${provider.name} succeeded: ${result.totalFiles} file(s)`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[terabox] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All terabox providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };