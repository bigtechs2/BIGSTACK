// ──────────────────────────────────────────────────
//  BIGSTACK — /soundcloud Command
//  Download SoundCloud tracks as MP3
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "soundcloud",
    aliases: ["sc", "scdl", "sound"],
    category: "downloader",
    description: "Download SoundCloud tracks as MP3",
    emoji: "☁️",
    usage: "<soundcloud url>",

    permissions: {
        coin: 5,
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
                `☁️ *SOUNDCLOUD*\n\n` +
                    `Download any SoundCloud track as MP3.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}soundcloud <soundcloud url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}soundcloud https://soundcloud.com/forss/flickermood`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate SoundCloud URL ─────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "soundcloud") {
            return ctx.reply("❌ Please provide a valid *SoundCloud* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching from SoundCloud...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_audio");

            // ─── 5. Call service ────────────────────
            logger.info(`[/soundcloud] user ${ctx.from.id} requesting ${url}`);
            const result = await services.soundcloud.download(url);

            // ─── 6. Update loading ──────────────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `☁️ *${result.title}*\n\n` +
                    `👤 *Artist:* ${result.channel}\n` +
                    (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                    `📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading audio...`,
                { parse_mode: "Markdown" }
            );

            // ─── 7. Download buffer ─────────────────
            logger.info(`[/soundcloud] downloading from ${result.provider}...`);
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
                `☁️ *${result.title}*\n\n` +
                `👤 *Artist:* ${result.channel}\n` +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}\n\n` +
                (result.videoUrl ? `🔗 [Open on SoundCloud](${result.videoUrl})` : "");

            // ─── 9. Send audio ──────────────────────
            await ctx.replyWithAudio(
                new InputFile(audioBuffer, `${sanitize(result.title)}.mp3`),
                {
                    title: result.title,
                    performer: result.channel,
                    duration: result.duration || 0,
                    caption,
                    parse_mode: "Markdown",
                    thumb: result.thumbnail || undefined
                }
            );

            // ─── 10. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/soundcloud] ✅ sent "${result.title}" to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/soundcloud] failed: ${error.message}`);

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
    if (error.message?.includes("All soundcloud providers failed")) {
        return "❌ *Download failed.*\n\nThis track might be region-locked or private.";
    }
    if (error.message?.includes("Invalid SoundCloud URL")) {
        return "❌ *Invalid SoundCloud URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}