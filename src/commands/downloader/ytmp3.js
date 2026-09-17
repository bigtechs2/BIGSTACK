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

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "ytmp3",
    aliases: ["mp3", "ytaudio", "yta"],
    category: "downloader",
    description: "Convert YouTube video to MP3 audio",
    emoji: "🎧",
    usage: "<youtube url>",

    permissions: {
        coin: 10,
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
                `🎧 *YTMP3*\n\n` +
                    `Convert any YouTube video to MP3.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}ytmp3 <youtube url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}ytmp3 https://youtube.com/watch?v=60rLYaz9Q1w`,
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
            `⏳ *Processing...*\n\nFetching MP3 from YouTube...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Show chat action ────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 5. Call the service ────────────────
            logger.info(`[/ytmp3] user ${ctx.from.id} requesting ${url}`);
            const result = await services.ytmp3.download(url);

            // ─── 6. Update loading message ──────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `🎧 *${result.title}*\n\n` +
                    `📡 *Provider:* ${result.provider}\n` +
                    `📥 Downloading audio...`,
                { parse_mode: "Markdown" }
            );

            // ─── 7. Download the audio buffer ───────
            logger.info(`[/ytmp3] downloading from ${result.provider}...`);
            const audioRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 60000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const audioBuffer = Buffer.from(audioRes.data);

            // ─── 8. Build caption ───────────────────
            const caption =
                `🎧 *${result.title}*\n\n` +
                (result.channel ? `👤 *Artist:* ${result.channel}\n` : "") +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}`;

            // ─── 9. Send the audio ──────────────────
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

            // ─── 10. Clean up loading message ───────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/ytmp3] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/ytmp3] failed: ${error.message}`);

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
    return (str || "audio")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60);
}

// ─── Helper: friendly error messages ────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All ytmp3 providers failed")) {
        return "❌ *Conversion failed.*\n\nThis video might be restricted or unavailable.";
    }
    if (error.message?.includes("Invalid YouTube URL")) {
        return "❌ *Invalid YouTube URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}