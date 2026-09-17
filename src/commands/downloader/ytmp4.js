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

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "ytmp4",
    aliases: ["mp4", "ytvideo", "ytv"],
    category: "downloader",
    description: "Download YouTube video as MP4",
    emoji: "🎬",
    usage: "<youtube url>",

    permissions: {
        coin: 15,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    // ─── Command Code ───────────────────────────────
    code: async (ctx) => {
        const url = ctx.args[0]?.trim();

        // ─── 1. Validate input ──────────────────────
        if (!url) {
            return ctx.reply(
                `🎬 *YTMP4*\n\n` +
                    `Download any YouTube video as MP4.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}ytmp4 <youtube url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}ytmp4 https://youtube.com/watch?v=60rLYaz9Q1w`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Check if valid YouTube URL ──────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "youtube") {
            return ctx.reply("❌ Please provide a valid *YouTube* link.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading message ────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching MP4 from YouTube...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Show chat action ────────────────
            await ctx.replyWithChatAction("upload_video");

            // ─── 5. Call the service ────────────────
            logger.info(`[/ytmp4] user ${ctx.from.id} requesting ${url}`);
            const result = await services.ytmp4.download(url);

            // ─── 6. Update loading message ──────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `🎬 *${result.title}*\n\n` +
                    `📡 *Provider:* ${result.provider}\n` +
                    `📥 Downloading video...`,
                { parse_mode: "Markdown" }
            );

            // ─── 7. Download the video buffer ───────
            logger.info(`[/ytmp4] downloading from ${result.provider}...`);
            const videoRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const videoBuffer = Buffer.from(videoRes.data);

            // ─── 8. Build caption ───────────────────
            const caption =
                `🎬 *${result.title}*\n\n` +
                (result.channel ? `👤 *Author:* ${result.channel}\n` : "") +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}`;

            // ─── 9. Send the video ──────────────────
            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `${sanitize(result.title)}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true
                }
            );

            // ─── 10. Clean up loading message ───────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/ytmp4] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/ytmp4] failed: ${error.message}`);

            const errorText = getErrorMessage(error);

            await ctx.api
                .editMessageText(ctx.chat.id, loading.message_id, errorText, {
                    parse_mode: "Markdown"
                })
                .catch(() => {
                    ctx.reply(errorText, { parse_mode: "Markdown" });
                });
        }
    }
};

// ─── Helper: format duration ────────────────────────
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Helper: sanitize filename ──────────────────────
function sanitize(str) {
    return (str || "video")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
}

// ─── Helper: friendly error messages ────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All ytmp4 providers failed")) {
        return "❌ *Download failed.*\n\nThis video might be restricted or unavailable.";
    }
    if (error.message?.includes("Invalid YouTube URL")) {
        return "❌ *Invalid YouTube URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nThe video is too large or the connection is slow.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}