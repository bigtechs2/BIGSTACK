// ──────────────────────────────────────────────────
//  BIGSTACK — Twitter / X Service
//  Download Twitter videos + audio (HD preferred)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");

// ─── Extract tweet ID from URL ──────────────────────
function extractTweetId(url) {
    if (!url) return null;
    const m = url.match(/status\/(\d+)/);
    return m ? m[1] : null;
}

// ─── Normalize duration ─────────────────────────────
function normalizeDuration(d) {
    if (!d) return 0;
    if (typeof d === "number") return Math.round(d);
    if (typeof d === "string") {
        // "0:15" → 15
        if (d.includes(":")) {
            const parts = d.split(":").map(Number);
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        const m = d.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    }
    return 0;
}

// ─── Sort video variants by bitrate (highest first) ─
function sortByBitrate(variants) {
    return [...variants].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
}

// ─── NORMALIZER: Zellrayy ───────────────────────────
// Response: { status, result: { text, author, media: { videos: [{ video_urls: [{bitrate, url}] }] } } }
function normalizeZellrayy(data) {
    const r = data.result || {};
    const videos = r.media?.videos || [];

    if (videos.length === 0) {
        // Check for images only
        const images = r.media?.images || r.media?.photos || [];
        if (images.length > 0) {
            return {
                type: "image",
                title: r.text || "Twitter Post",
                author: r.author?.name || "Unknown",
                thumbnail: images[0]?.url || images[0],
                images: images.map((i) => i.url || i),
                videos: [],
                audio: null
            };
        }
        return null;
    }

    // Sort video variants by bitrate (HD first)
    const variants = sortByBitrate(videos[0].video_urls || []);
    const bestVideo = variants[0];
    if (!bestVideo) return null;

    return {
        type: "video",
        title: r.text || "Twitter Video",
        author: r.author?.name || "Unknown",
        thumbnail: videos[0].thumbnail_url || null,
        duration: normalizeDuration(videos[0].duration),
        videoUrl: bestVideo.url,
        videoQuality: `${bestVideo.bitrate ? Math.round(bestVideo.bitrate / 1000) + "kbps" : "HD"}`,
        images: [],
        videos: videos.map((v) => ({
            url: sortByBitrate(v.video_urls || [])[0]?.url,
            thumbnail: v.thumbnail_url,
            duration: normalizeDuration(v.duration)
        })),
        audio: null
    };
}

// ─── NORMALIZER: Azbry ──────────────────────────────
// Response: { status, result: { title, author, media: [{ type, url, thumbnail }], stats } }
function normalizeAzbry(data) {
    const r = data.result || {};
    const media = Array.isArray(r.media) ? r.media : [];

    const videos = media.filter((m) => m.type?.includes("video"));
    const images = media.filter((m) => m.type?.includes("image"));

    if (videos.length === 0 && images.length === 0) return null;

    return {
        type: videos.length > 0 ? "video" : "image",
        title: r.title || "Twitter Post",
        author: r.author?.name || "Unknown",
        thumbnail: videos[0]?.thumbnail || images[0]?.url || null,
        duration: 0, // Azbry doesn't return duration
        videoUrl: videos[0]?.url || null,
        videoQuality: "HD",
        images: images.map((i) => i.url),
        videos: videos.map((v) => ({ url: v.url, thumbnail: v.thumbnail })),
        audio: null
    };
}

// ─── NORMALIZER: Nexray ─────────────────────────────
// Response: { status, result: { type, title, duration, thumbnail, download_url: [{ name, type, resolusi, url }] } }
function normalizeNexray(data) {
    const r = data.result || {};
    const downloads = Array.isArray(r.download_url) ? r.download_url : [];

    if (downloads.length === 0) return null;

    // Separate by type
    const videos = downloads.filter((d) => d.type === "mp4" || d.type === "video");
    const audios = downloads.filter((d) => d.type === "mp3" || d.type === "audio");
    const images = downloads.filter((d) => d.type === "image");

    // Sort videos by resolution (highest first)
    const sortedVideos = videos.sort((a, b) => {
        const ra = parseInt(a.resolusi) || 0;
        const rb = parseInt(b.resolusi) || 0;
        return rb - ra;
    });

    const bestVideo = sortedVideos[0];

    return {
        type: "video",
        title: r.title || "Twitter Video",
        author: "Unknown", // Nexray doesn't return author name
        thumbnail: r.thumbnail || null,
        duration: normalizeDuration(r.duration),
        videoUrl: bestVideo?.url || null,
        videoQuality: bestVideo?.resolusi || "HD",
        images: images.map((i) => i.url),
        videos: sortedVideos.map((v) => ({
            url: v.url,
            quality: v.resolusi,
            name: v.name
        })),
        audio: audios[0]?.url || null,
        audioQuality: audios[0]?.name || "MP3"
    };
}

// ─── Main download function ─────────────────────────
async function download(url) {
    // ─── 1. Validate ────────────────────────────────
    if (!url || typeof url !== "string") {
        throw new Error("URL is required");
    }

    if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "twitter") {
        throw new Error("Invalid Twitter/X URL");
    }

    const tweetId = extractTweetId(url);
    if (!tweetId) {
        throw new Error("Could not extract tweet ID");
    }

    // ─── 2. Cache check ─────────────────────────────
    const cacheKey = `twitter:${tweetId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
        logger.info(`[twitter] ✅ cache hit for ${tweetId}`);
        return cached;
    }

    // ─── 3. Get providers ───────────────────────────
    const providers = config.getProviders("twitter");
    logger.info(`[twitter] processing ${tweetId} across ${providers.length} providers`);

    let lastError = null;

    // ─── 4. Try each provider ───────────────────────
    for (const provider of providers) {
        try {
            logger.info(`[twitter] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: url },
                timeout: provider.timeout || 45000
            });

            // ─── Check success ──────────────────────
            if (!data?.status) {
                throw new Error("Response reported failure");
            }

            // ─── Normalize per provider ─────────────
            let normalized = null;
            if (provider.shape === "zellrayy") normalized = normalizeZellrayy(data);
            if (provider.shape === "azbry")    normalized = normalizeAzbry(data);
            if (provider.shape === "nexray")   normalized = normalizeNexray(data);

            if (!normalized) {
                throw new Error("No media found in response");
            }

            // ─── Ensure we have at least one video URL ─
            if (!normalized.videoUrl && normalized.images?.length === 0) {
                throw new Error("No downloadable media found");
            }

            // ─── Build final result ─────────────────
            const result = {
                provider: provider.name,
                tweetId,
                url,
                type: normalized.type,
                title: normalized.title,
                author: normalized.author,
                thumbnail: normalized.thumbnail,
                duration: normalized.duration || 0,
                videoUrl: normalized.videoUrl,
                videoQuality: normalized.videoQuality || null,
                videos: normalized.videos || [],
                images: normalized.images || [],
                audio: normalized.audio || null,
                audioQuality: normalized.audioQuality || null,
                raw: data
            };

            logger.info(
                `[twitter] ✅ ${provider.name} succeeded (${result.type}): "${result.title}"`
            );

            // ─── Cache 30 min ───────────────────────
            await cache.set(cacheKey, result, config.constants.CACHE_TTL.DOWNLOAD);

            return result;

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[twitter] ❌ ${provider.name} failed: ${msg}`);
            lastError = err;
            continue;
        }
    }

    throw lastError || new Error("All twitter providers failed");
}

// ─── Export ─────────────────────────────────────────
module.exports = { download };