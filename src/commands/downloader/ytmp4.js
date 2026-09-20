// ──────────────────────────────────────────────────
//  BIGSTACK — /ytmp4 Command
//  YouTube URL → MP4 video
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

module.exports = {
    name: "ytmp4",
    aliases: ["mp4", "ytvideo", "ytv"],
    category: "downloader",
    description: "Download YouTube video as MP4",
    emoji: "▣",
    usage: "<youtube url>",

    permissions: {
        coin: 15,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const url = ctx.args[0]?.trim();

        // ─── 1. Validate input ─────────────────────
        if (!url) {
            return ctx.reply(
                `▣ *YTMP4*\n\n` +
                `◈ Download any YouTube video as MP4\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}ytmp4 <youtube url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}ytmp4 https://youtube.com/watch?v=60rLYaz9Q1w`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate YouTube URL ───────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "youtube") {
            return ctx.reply(
                `✗  Invalid URL\n\n` +
                `   Please provide a valid YouTube link.`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 3. Start live progress ────────────────
        const progress = await startProgress(ctx, {
            emoji: "▣",
            title: "Fetching MP4 from YouTube...",
            command: "ytmp4",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_video");

            logger.info(`[/ytmp4] user ${ctx.from.id} requesting ${url}`);
            const result = await services.ytmp4.download(url);

            // Expose provider for ACTIVITY group
            ctx.progressProvider = result.provider;

            progress.setProvider(result.provider);
            progress.setTitle("Downloading video...");

            // ─── Download buffer ────────────────────
            logger.info(`[/ytmp4] downloading from ${result.provider}...`);
            const videoRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 180000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const videoBuffer = Buffer.from(videoRes.data);

            // ─── Build card caption ─────────────────
            const caption = buildCardCaption(result);

            // ─── Send video ─────────────────────────
            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `${sanitize(result.title)}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true,
                    thumbnail: result.thumbnail || undefined
                }
            );

            // ─── Final success ──────────────────────
            await progress.finish({
                success: true,
                title: "Video Sent",
                extra:
                    `✓  YouTube MP4 delivered\n\n` +
                    `   ▣ Title     ➤ ${truncate(result.title, 50)}\n` +
                    `   ◉ Author    ➤ ${result.channel || "unknown"}\n` +
                    (result.duration ? `   ◐ Duration  ➤ ${formatDuration(result.duration)}\n` : "") +
                    `   ⊛ Provider  ➤ ${result.provider}`
            });

            logger.info(`[/ytmp4] ✓ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/ytmp4] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: getErrorMessage(error)
            });
        }
    }
};

// ═══════════════════════════════════════════════
//  Card builder
// ═══════════════════════════════════════════════
function buildCardCaption(result) {
    const title = result.title && result.title.length > 100
        ? result.title.slice(0, 100) + "..."
        : result.title || "YouTube Video";

    const lines = [
        `▣  *YTMP4 VIDEO*`,
        ``,
        `◈ ${title}`,
        ``
    ];

    if (result.channel) lines.push(`◉ Author    ➤  ${result.channel}`);
    if (result.duration) lines.push(`◐ Duration  ➤  ${formatDuration(result.duration)}`);
    lines.push(`⊛ Provider  ➤  ${result.provider}`);

    lines.push(``);
    lines.push(`▸ ✓ successfully downloaded`);

    return lines.join("\n");
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function sanitize(str) {
    return (str || "video")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
}

function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : str;
}

function getErrorMessage(error) {
    if (error.message?.includes("All ytmp4 providers failed")) {
        return (
            `✗  Download failed\n\n` +
            `   This video might be restricted or unavailable.`
        );
    }
    if (error.message?.includes("Invalid YouTube URL")) {
        return `✗  Invalid YouTube URL`;
    }
    if (error.response?.status === 429) {
        return (
            `◐  Rate limited\n\n` +
            `   Please wait a minute before trying again.`
        );
    }
    if (error.code === "ECONNABORTED") {
        return (
            `◕  Download timeout\n\n` +
            `   The video is too large or the connection is slow.`
        );
    }
    if (error.message?.includes("request entity too large")) {
        return `✗  Video too large for Telegram`;
    }
    return (
        `✗  Something went wrong\n\n` +
        `   Please try again later.`
    );
}