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
const { startProgress } = require("../../utils/progress");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "spotifyplay",
    aliases: ["spplay", "spsearch", "spotifysearch"],
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

        // ─── 2. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "🎧",
            title: "Searching Spotify...",
            command: "spotifyplay",
            input: query
        });

        try {
            // ─── 3. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 4. Call service ────────────────────
            logger.info(`[/spotifyplay] user ${ctx.from.id} searching "${query}"`);
            const result = await services.spotifyplay.search(query);

            // ─── 5. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle("Downloading audio...");

            // ─── 6. Download the buffer ─────────────
            logger.info(`[/spotifyplay] downloading from ${result.provider}...`);
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

            // ─── 7. Build caption ───────────────────
            const caption =
                `🎧 *${result.title}*\n\n` +
                `👤 *Artist:* ${result.channel}\n` +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}`;

            // ─── 8. Send audio ──────────────────────
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

            // ─── 9. Final success ───────────────────
            await progress.finish({
                success: true,
                title: "Song Sent!",
                extra:
                    `🎧 ${truncate(result.title, 50)}\n` +
                    `👤 ${result.channel}` +
                    (result.duration ? ` · ⏱ ${formatDuration(result.duration)}` : "")
            });

            logger.info(`[/spotifyplay] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/spotifyplay] failed: ${error.message}`);

            const errorText = getErrorMessage(error);

            // ─── Final error ────────────────────────
            await progress.finish({
                success: false,
                title: "Search Failed",
                extra: errorText
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

// ─── Helper: truncate ───────────────────────────────
function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
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