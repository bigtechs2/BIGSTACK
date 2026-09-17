// ──────────────────────────────────────────────────
//  BIGSTACK — /spotifyplay Command
//  Search + download Spotify tracks
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "spotifyplay",
    aliases: ["sp", "spsearch", "spotifydl"],
    category: "downloader",
    description: "Search and download Spotify tracks",
    emoji: "🎧",
    usage: "<song name>",

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
        const query = ctx.args.join(" ").trim();

        // ─── 1. Validate input ──────────────────────
        if (!query) {
            return ctx.reply(
                `🎧 *SPOTIFY PLAY*\n\n` +
                    `Search and download songs from Spotify.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}spotifyplay <song name>\n\n` +
                    `*Examples:*\n` +
                    `${config.prefix}spotifyplay Montagem rabeta\n` +
                    `${config.prefix}spotifyplay Alan Walker Faded`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Send loading ────────────────────────
        const loading = await ctx.reply(
            `🔍 *Searching Spotify...*\n\nLooking for *${query}*\nPlease wait...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 3. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 4. Call service ────────────────────
            logger.info(`[/spotifyplay] user ${ctx.from.id} searching "${query}"`);
            const result = await services.spotifyplay.search(query);

            // ─── 5. Update loading message ──────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `🎧 *${result.title}*\n\n` +
                    `👤 *Artist:* ${result.channel}\n` +
                    `⏱ *Duration:* ${formatDuration(result.duration)}\n` +
                    `📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading audio...`,
                { parse_mode: "Markdown" }
            );

            // ─── 6. Download the buffer ─────────────
            logger.info(`[/spotifyplay] downloading from ${result.provider}...`);
            const audioRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 60000,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const audioBuffer = Buffer.from(audioRes.data);

            // ─── 7. Build caption ───────────────────
            const caption =
                `🎧 *${result.title}*\n\n` +
                `👤 *Artist:* ${result.channel}\n` +
                `⏱ *Duration:* ${formatDuration(result.duration)}\n` +
                `📡 *Provider:* ${result.provider}`;

            // ─── 8. Send audio ──────────────────────
            await ctx.replyWithAudio(
                new InputFile(audioBuffer, `${sanitize(result.title)}.mp3`),
                {
                    title: result.title,
                    performer: result.channel,
                    duration: result.duration,
                    caption,
                    parse_mode: "Markdown"
                }
            );

            // ─── 9. Clean up ────────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/spotifyplay] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/spotifyplay] failed: ${error.message}`);

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

// ─── Helper: friendly errors ────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All spotifyplay providers failed")) {
        return "❌ *No results found.*\n\nTry a different song name.";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}