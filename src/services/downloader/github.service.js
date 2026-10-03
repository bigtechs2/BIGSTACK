// ──────────────────────────────────────────────────
//  BIGSTACK — GitHub Service
//  Download repositories as ZIP / TAR
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ══════════════════════════════════════════════════
//  Parse owner + repo from URL
// ══════════════════════════════════════════════════
function parseRepo(url) {
    if (!url) return null;

    const m = url.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/);
    if (!m) return null;

    return {
        owner: m[1],
        repo: m[2].replace(/\.git$/, "").trim()  // ← trim trailing spaces!
    };
}

// ══════════════════════════════════════════════════
//  Format bytes
// ══════════════════════════════════════════════════
function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ══════════════════════════════════════════════════
//  Build download URLs for BOTH zip and tar
//  Handles trailing spaces, url encoding
// ══════════════════════════════════════════════════
function buildDownloadUrls(owner, repo, branch) {
    const cleanOwner = String(owner).trim();
    const cleanRepo = String(repo).trim();
    const cleanBranch = String(branch || "main").trim();

    const base = `https://github.com/${cleanOwner}/${cleanRepo}/archive/refs/heads/${cleanBranch}`;

    return {
        zip: `${base}.zip`,
        tar: `${base}.tar.gz`
    };
}

// ══════════════════════════════════════════════════
//  NORMALIZER: Zellrayy
// ══════════════════════════════════════════════════
function normalizeZellrayy(data) {
    const r = data.result || {};

    const owner = String(r.owner || "unknown").trim();
    const repo = String(r.repo || "repo").trim();
    const branch = String(r.default_branch || "main").trim();

    const urls = buildDownloadUrls(owner, repo, branch);

    return {
        owner,
        repo,
        description: r.description || null,
        stars: r.stars || 0,
        forks: r.forks || 0,
        language: r.language || "Unknown",
        branch,
        sizeKb: r.size_kb || 0,
        size: (r.size_kb || 0) * 1024,
        sizeFormatted: formatBytes((r.size_kb || 0) * 1024),
        updatedAt: r.updated_at || null,
        // Use generated URLs instead of API-provided ones
        zipUrl: urls.zip,
        tarUrl: urls.tar
    };
}

// ══════════════════════════════════════════════════
//  NORMALIZER: Nexray
// ══════════════════════════════════════════════════
function normalizeNexray(data) {
    const r = data.result || {};

    const filename = String(r.filename || "").trim();
    const repo = String(r.repo || "repo").trim();
    const branch = String(r.branch || "main").trim();

    // Extract owner from original URL (not from filename)
    const originalUrl = r.url || r.source || "";
    const parsed = parseRepo(originalUrl);
    const owner = parsed ? parsed.owner : "unknown";

    const urls = buildDownloadUrls(owner, repo, branch);

    return {
        owner,
        repo,
        description: null,
        stars: 0,
        forks: 0,
        language: "Unknown",
        branch,
        sizeKb: 0,
        size: 0,
        sizeFormatted: "Unknown",
        updatedAt: null,
        zipUrl: urls.zip,
        tarUrl: urls.tar
    };
}

// ══════════════════════════════════════════════════
//  Verify download URL works
// ══════════════════════════════════════════════════
async function verifyUrl(url) {
    try {
        const res = await axios.head(url, {
            timeout: 15000,
            maxRedirects: 5,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/zip, application/octet-stream, */*"
            },
            validateStatus: (s) => s < 500
        });

        return res.status === 200;
    } catch {
        return false;
    }
}

// ══════════════════════════════════════════════════
//  Try fallback branches
// ══════════════════════════════════════════════════
async function resolveWorkingUrl(owner, repo, preferredBranch, format) {
    const branches = [preferredBranch, "main", "master"].filter(
        (b, i, arr) => b && arr.indexOf(b) === i
    );

    for (const branch of branches) {
        const urls = buildDownloadUrls(owner, repo, branch);
        const url = format === "tar" ? urls.tar : urls.zip;

        const ok = await verifyUrl(url);
        if (ok) {
            logger.info(`[github] ${format} works on branch=${branch}`);
            return { url, branch, format };
        }

        logger.warn(`[github] ${format} 404 on branch=${branch}`);
    }

    return null;
}

// ══════════════════════════════════════════════════
//  Main download function
// ══════════════════════════════════════════════════
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
    const cacheKey = `github:${repoKey}:${format}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[github] ✅ cache hit for ${repoKey} (${format})`);
        return cached;
    }

    // ─── 3. Get providers for metadata ─────────────
    const providers = config.getProviders("github");
    logger.info(`[github] processing ${repoKey} across ${providers.length} providers`);

    let metadata = null;
    let lastError = null;

    // ─── 4. Try providers for metadata ─────────────
    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[github] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 60000
            });

            if (!data?.status) throw new Error("Response reported failure");

            let normalized = null;
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);
            if (provider.shape === "nexray")   normalized = normalizeNexray(data);

            if (!normalized) throw new Error("Normalizer failed");

            metadata = { provider: provider.name, ...normalized };

            logger.info(`[github] ✅ ${provider.name}: ${repoKey}`);
            break;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[github] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
        }
    }

    // ─── 5. Fallback metadata if all providers failed ─
    if (!metadata) {
        logger.warn(`[github] all providers failed, using manual metadata`);
        metadata = {
            provider: "manual",
            owner,
            repo,
            description: null,
            stars: 0,
            forks: 0,
            language: "Unknown",
            branch: "main",
            sizeKb: 0,
            size: 0,
            sizeFormatted: "Unknown",
            updatedAt: null,
            zipUrl: buildDownloadUrls(owner, repo, "main").zip,
            tarUrl: buildDownloadUrls(owner, repo, "main").tar
        };
    }

    // ─── 6. Verify + fix download URL ───────────────
    logger.info(`[github] verifying download URL...`);

    const working = await resolveWorkingUrl(
        metadata.owner,
        metadata.repo,
        metadata.branch,
        format
    );

    if (!working) {
        throw new Error("No working branch found (tried main, master)");
    }

    // ─── 7. Build final result ──────────────────────
    const result = {
        provider: metadata.provider,
        owner: metadata.owner,
        repo: metadata.repo,
        fullName: `${metadata.owner}/${metadata.repo}`,
        description: metadata.description,
        stars: metadata.stars,
        forks: metadata.forks,
        language: metadata.language,
        branch: working.branch,
        size: metadata.size,
        sizeFormatted: metadata.sizeFormatted,
        updatedAt: metadata.updatedAt,
        zipUrl: metadata.zipUrl,
        tarUrl: metadata.tarUrl,
        download: working.url,
        format: working.format,
        filename: `${metadata.repo}-${working.branch}.${working.format}`,
        raw: metadata.raw || null
    };

    logger.info(`[github] ✅ resolved: ${result.filename} → ${working.url}`);

    // ─── 8. Cache 30 min ────────────────────────────
    await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

    return result;
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };