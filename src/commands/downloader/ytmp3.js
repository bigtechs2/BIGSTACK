// ──────────────────────────────────────────────────
//  BIGSTACK — /ytmp3 Command
//  YouTube URL → MP3 audio
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

module.exports = {
    name: "ytmp3",
    aliases: ["mp3", "ytaudio", "yta"],
    category: "downloader",
    description: "Convert YouTube video to MP3 audio",
    emoji: "♬",
    usage: "<youtube url>",

    permissions: {
        coin: 10,
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
                `♬ *YTMP3*\n\n` +
                `◈ Convert any YouTube video to MP3\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}ytmp3 <youtube url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}ytmp3 https://youtube.com/watch?v=60rLYaz9Q1w`,
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
            emoji: "♬",
            title: "Fetching MP3 from YouTube...",
            command: "ytmp3",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_audio");

            logger.info(`[/ytmp3] user ${ctx.from.id} requesting ${url}`);
            const result = await services.ytmp3.download(url);

            // Expose provider for ACTIVITY group
            ctx.progressProvider = result.provider;

            progress.setProvider(result.provider);
            progress.setTitle("Downloading audio...");

            // ─── Download buffer ────────────────────
            logger.info(`[/ytmp3] downloading from ${result.provider}...`);
            const audioRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const audioBuffer = Buffer.from(audioRes.data);

            // ─── Build card caption ─────────────────
            const caption = buildCardCaption(result);

            // ─── Send audio ─────────────────────────
            await ctx.replyWithAudio(
                new InputFile(audioBuffer, `${sanitize(result.title)}.mp3`),
                {
                    title: result.title,
                    performer: result.channel || "Unknown",
                    duration: result.duration || 0,
                    caption,
                    parse_mode: "Markdown"
                }
            );

            // ─── Final success ──────────────────────
            await progress.finish({
                success: true,
                title: "MP3 Sent",
                extra:
                    `✓  YouTube MP3 delivered\n\n` +
                    `   ♬ Title     ➤ ${truncate(result.title, 50)}\n` +
                    `   ◉ Artist    ➤ ${result.channel || "unknown"}\n` +
                    (result.duration ? `   ▣ Duration  ➤ ${formatDuration(result.duration)}\n` : "") +
                    `   ⊛ Provider  ➤ ${result.provider}`
            });

            logger.info(`[/ytmp3] ✓ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/ytmp3] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Conversion Failed",
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
        : result.title || "YouTube Audio";

    const lines = [
        `♬  *YTMP3 AUDIO*`,
        ``,
        `◈ ${title}`,
        ``
    ];

    if (result.channel) lines.push(`◉ Artist    ➤  ${result.channel}`);
    if (result.duration) lines.push(`▣ Duration  ➤  ${formatDuration(result.duration)}`);
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
    return (str || "audio")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
}

function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

function getErrorMessage(error) {
    if (error.message?.includes("All ytmp3 providers failed")) {
        return (
            `✗  Conversion failed\n\n` +
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
            `   Connection is too slow today.`
        );
    }
    if (error.message?.includes("request entity too large")) {
        return `✗  Audio too large for Telegram`;
    }
    return (
        `✗  Something went wrong\n\n` +
        `   Please try again later.`
    );
}