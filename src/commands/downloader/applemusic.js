// ──────────────────────────────────────────────────
//  BIGSTACK — /applemusic Command
//  Download Apple Music tracks as MP3
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "applemusic",
    aliases: ["am", "applem", "appledl"],
    category: "downloader",
    description: "Download Apple Music tracks as MP3",
    emoji: "🍎",
    usage: "<apple music url>",

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
                `🍎 *APPLE MUSIC*\n\n` +
                    `Download any Apple Music track as MP3.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}applemusic <apple music url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}applemusic https://music.apple.com/id/album/montagem-rabeta-single/1840501929`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate Apple Music URL ────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "applemusic") {
            return ctx.reply("❌ Please provide a valid *Apple Music* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Start live progress message ─────────
        const progress = await startProgress(ctx, {
            emoji: "🍎",
            title: "Fetching Apple Music...",
            command: "applemusic",
            input: url
        });

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 5. Call service ────────────────────
            logger.info(`[/applemusic] user ${ctx.from.id} requesting ${url}`);
            const result = await services.applemusic.download(url);

            // ─── 6. Update progress with provider ───
            progress.setProvider(result.provider);
            progress.setTitle("Downloading audio...");

            // ─── 7. Download buffer ─────────────────
            logger.info(`[/applemusic] downloading from ${result.provider}...`);
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

            // ─── 8. Build caption ───────────────────
            const caption =
                `🍎 *${result.title}*\n\n` +
                `👤 *Artist:* ${result.channel}\n` +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}\n\n` +
                (result.videoUrl ? `🔗 [Open on Apple Music](${result.videoUrl})` : "");

            // ─── 9. Send audio ──────────────────────
            await ctx.replyWithAudio(
                new InputFile(audioBuffer, `${sanitize(result.title)}.mp3`),
                {
                    title: result.title,
                    performer: result.channel,
                    duration: result.duration || 0,
                    caption,
                    parse_mode: "Markdown"
                }
            );

            // ─── 10. Final success message ──────────
            await progress.finish({
                success: true,
                title: "MP3 Sent!",
                extra: `🎵 ${result.title}`
            });

            logger.info(`[/applemusic] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/applemusic] failed: ${error.message}`);

            const errorText = getErrorMessage(error);

            // ─── Final error message ────────────────
            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: errorText
            });
        }
    }
};

// ─── Helpers ────────────────────────────────────────
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

function getErrorMessage(error) {
    if (error.message?.includes("All applemusic providers failed")) {
        return "❌ *Download failed.*\n\nThis track might be region-locked or unavailable.";
    }
    if (error.message?.includes("Invalid Apple Music URL")) {
        return "❌ *Invalid Apple Music URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}