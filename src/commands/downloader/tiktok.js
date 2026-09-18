// ──────────────────────────────────────────────────
//  BIGSTACK — /tiktok Command
//  Download TikTok videos (no watermark, HD)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "tiktok",
    aliases: ["tt", "ttdl"],
    category: "downloader",
    description: "Download TikTok videos without watermark",
    emoji: "🎵",
    usage: "<tiktok url>",

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
                `🎵 *TIKTOK*\n\n` +
                    `Download TikTok videos without watermark.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}tiktok <tiktok url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}tiktok https://vt.tiktok.com/ZSuCudN2c/`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate TikTok URL ─────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "tiktok") {
            return ctx.reply("❌ Please provide a valid *TikTok* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching from TikTok...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_video");

            // ─── 5. Call service ────────────────────
            logger.info(`[/tiktok] user ${ctx.from.id} requesting ${url}`);
            const result = await services.tiktok.download(url);

            // ─── 6. Update loading ──────────────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `🎵 *TikTok Video*\n\n` +
                    `👤 *Author:* ${result.author}\n` +
                    `🎞 *Quality:* ${result.quality.toUpperCase()}` +
                    (result.watermark ? " (with watermark)" : " (no watermark)") +
                    `\n📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading video...`,
                { parse_mode: "Markdown" }
            );

            // ─── 7. Download buffer ─────────────────
            logger.info(`[/tiktok] downloading from ${result.provider}...`);
            const videoRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.tiktok.com/"
                }
            });
            const videoBuffer = Buffer.from(videoRes.data);

            // ─── 8. Build caption ───────────────────
            const shortTitle =
                result.title.length > 150
                    ? result.title.slice(0, 150) + "..."
                    : result.title;

            const caption =
                `🎵 *TikTok Video*\n\n` +
                `${shortTitle}\n\n` +
                `👤 *Author:* ${result.author}\n` +
                `🎞 *Quality:* ${result.quality.toUpperCase()}` +
                (result.watermark ? "" : " · _no watermark_");

            // ─── 9. Send video ──────────────────────
            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `tiktok_${result.videoId}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true,
                    thumbnail: result.thumbnail || undefined
                }
            );

            // ─── 10. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/tiktok] ✅ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/tiktok] failed: ${error.message}`);

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
function getErrorMessage(error) {
    if (error.message?.includes("All tiktok providers failed")) {
        return "❌ *Download failed.*\n\nThis video might be private or unavailable.";
    }
    if (error.message?.includes("Invalid TikTok URL")) {
        return "❌ *Invalid TikTok URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}