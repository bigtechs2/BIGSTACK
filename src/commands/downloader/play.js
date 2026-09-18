// ──────────────────────────────────────────────────
//  BIGSTACK — /play Command
//  Search and download audio from YouTube
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
    name: "play",
    aliases: ["ytplay", "music", "song"],
    category: "downloader",
    description: "Search and download audio from YouTube",
    emoji: "🎵",
    usage: "<song name or url>",

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
                `🎵 *PLAYER*\n\n` +
                    `Search and download audio from YouTube.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}play <song name>\n\n` +
                    `*Examples:*\n` +
                    `${config.prefix}play Montagem rabeta\n` +
                    `${config.prefix}play Alan Walker Faded`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "🎵",
            title: "Searching YouTube...",
            command: "play",
            input: query
        });

        try {
            // ─── 3. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 4. Call service ────────────────────
            logger.info(`[/play] user ${ctx.from.id} searching "${query}"`);
            const result = await services.play.search(query);

            // ─── 5. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle(`Downloading audio...`);

            // ─── 6. Download the audio buffer ───────
            logger.info(`[/play] downloading from ${result.provider}...`);
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

            // ─── 7. Build final caption ─────────────
            const caption =
                `🎵 *${result.title}*\n\n` +
                `👤 *Artist:* ${result.channel}\n` +
                `⏱ *Duration:* ${formatDuration(result.duration)}\n` +
                `📡 *Provider:* ${result.provider}\n\n` +
                (result.videoUrl ? `🔗 [Watch on YouTube](${result.videoUrl})` : "");

            // ─── 8. Send the audio ──────────────────
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
                    `🎵 ${truncate(result.title, 50)}\n` +
                    `👤 ${result.channel} · ⏱ ${formatDuration(result.duration)}`
            });

            logger.info(`[/play] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/play] failed for "${query}": ${error.message}`);

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

// ─── Helper: friendly error messages ────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All play providers failed")) {
        return "❌ *No results found.*\n\nTry a different search term.";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute and try again.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    if (error.response?.status === 404) {
        return "❌ *Song not found.*\n\nTry a different query.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}