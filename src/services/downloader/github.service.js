// ──────────────────────────────────────────────────
//  BIGSTACK — GitHub Service
//  Download repositories as ZIP / TAR
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract owner + repo from URL ──────────────────
function parseRepo(url) {
    if (!url) return null;
    const m = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/);
    if (!m) return null;
    return {
        owner: m[1],
        repo: m[2].replace(/\.git$/, "").trim()
    };
}

// ─── Format bytes ───────────────────────────────────
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
// Response: { status, result: { owner, repo, description, stars, forks, language, size_kb, download: { zip, tar } } }
function normalizeZellrayy(data) {
    const r = data.result || {};

    return {
        owner: r.owner || "unknown",
        repo: (r.repo || "repo").trim(),
        description: r.description || null,
        stars: r.stars || 0,
        forks: r.forks || 0,
        language: r.language || "Unknown",
        branch: r.default_branch || "main",
        sizeKb: r.size_kb || 0,
        size: (r.size_kb || 0) * 1024,
        sizeFormatted: formatBytes((r.size_kb || 0) * 1024),
        updatedAt: r.updated_at || null,
        zipUrl: r.download?.zip || null,
        tarUrl: r.download?.tar || null
    };
}

// ─── NORMALIZER: Nexray ─────────────────────────────
// Response: { status, result: { filename, repo, branch, url } }
function normalizeNexray(data) {
    const r = data.result || {};

    // Extract owner from filename if possible (filename = "Owner-Repo-branch.zip")
    const filename = r.filename || "";
    const parts = filename.replace(/\.zip$/, "").split("-");
    const owner = parts.length >= 2 ? "unknown" : "unknown";

    return {
        owner,
        repo: (r.repo || "repo").trim(),
        description: null,
        stars: 0,
        forks: 0,
        language: "Unknown",
        branch: r.branch || "main",
        sizeKb: 0,
        size: 0,
        sizeFormatted: "Unknown",
        updatedAt: null,
        zipUrl: r.url || null,
        tarUrl: null
    };
}

// ─── Main download function ─────────────────────────
async function download(url, format = "zip") {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "github") {
        throw new Error("Invalid GitHub URL");
    }

    const parsed = parseRepo(url);
    if (!parsed) {
        throw new Error("Could not parse GitHub URL");
    }

    const { owner, repo } = parsed;
    const repoKey = `${owner}/${repo}`;

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `github:${repoKey}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[github] ✅ cache hit for ${repoKey}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("github");
    logger.info(`[github] processing ${repoKey} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[github] trying ${provider.name}...`);

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
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);
            if (provider.shape === "nexray")   normalized = normalizeNexray(data);

            if (!normalized?.zipUrl && !normalized?.tarUrl) {
                throw new Error("No download URL found");
            }

            // ─── Pick the download based on format ──
            const downloadUrl =
                format === "tar"
                    ? normalized.tarUrl || normalized.zipUrl
                    : normalized.zipUrl || normalized.tarUrl;

            if (!downloadUrl) {
                throw new Error(`No ${format.toUpperCase()} download available`);
            }

            // ─── Build final result ─────────────────
            const result = {
                provider: provider.name,
                owner: normalized.owner,
                repo: normalized.repo,
                fullName: `${normalized.owner}/${normalized.repo}`,
                description: normalized.description,
                stars: normalized.stars,
                forks: normalized.forks,
                language: normalized.language,
                branch: normalized.branch,
                size: normalized.size,
                sizeFormatted: normalized.sizeFormatted,
                updatedAt: normalized.updatedAt,
                zipUrl: normalized.zipUrl,
                tarUrl: normalized.tarUrl,
                download: downloadUrl,
                format,
                filename: `${normalized.repo}-${normalized.branch}.${format}`,
                raw: data
            };

            logger.info(
                `[github] ✅ ${provider.name} succeeded: ${result.fullName} (${result.format})`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[github] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All github providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };