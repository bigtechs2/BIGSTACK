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
const { startProgress } = require("../../utils/progress");

const MAX_SEND_SIZE = (config.limits?.maxSendSizeMB || 30) * 1024 * 1024;

module.exports = {
    name: "tiktok",
    aliases: ["tt", "ttdl"],
    category: "downloader",
    description: "Download TikTok videos without watermark",
    emoji: "♬",
    usage: "<tiktok url>",

    permissions: {
        coin: 5,
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
                `♬ *TIKTOK DOWNLOADER*\n\n` +
                `◈ Download TikTok videos without watermark\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}tiktok <tiktok url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}tiktok https://vt.tiktok.com/ZSuCudN2c/`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ───────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "tiktok") {
            return ctx.reply(
                `✗  Invalid URL\n\n` +
                `   Please provide a valid TikTok link.`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 3. Start live progress ────────────────
        const progress = await startProgress(ctx, {
            emoji: "♬",
            title: "Fetching from TikTok...",
            command: "tiktok",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_video");

            logger.info(`[/tiktok] user ${ctx.from.id} requesting ${url}`);
            const result = await services.tiktok.download(url);

            progress.setProvider(result.provider);
            progress.setTitle(`Downloading ${result.quality.toUpperCase()} video...`);

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

            // ─── Build card caption ────────────────
            const caption = buildCardCaption(result);

            // ─── Send video with card caption ──────
            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `tiktok_${result.videoId}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true,
                    thumbnail: result.thumbnail || undefined
                }
            );

            await progress.finish({
                success: true,
                title: "Video Sent",
                extra:
                    `✓  TikTok delivered\n\n` +
                    `   ♬ Quality   ➤ ${result.quality.toUpperCase()}\n` +
                    `   ◉ Author    ➤ ${result.author}\n` +
                    `   ▣ Watermark ➤ ${result.watermark ? "yes" : "no"}`
            });

            logger.info(`[/tiktok] ✓ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/tiktok] failed: ${error.message}`);

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
    const title = result.title.length > 100
        ? result.title.slice(0, 100) + "..."
        : result.title;

    const quality = result.quality.toUpperCase();
    const wm = result.watermark ? "wm" : "no wm";

    return (
        `♬  *TIKTOK VIDEO*\n\n` +
        `◈ ${title}\n\n` +
        `◉ Author    ➤  ${result.author}\n` +
        `▣ Quality   ➤  ${quality} · ${wm}\n` +
        `⊛ Provider  ➤  ${result.provider}\n\n` +
        `▸ ✓ successfully downloaded`
    );
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════
function getErrorMessage(error) {
    if (error.message?.includes("All tiktok providers failed")) {
        return (
            `✗  Download failed\n\n` +
            `   This video might be private or unavailable.`
        );
    }
    if (error.message?.includes("Invalid TikTok URL")) {
        return `✗  Invalid TikTok URL`;
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
        return `✗  Video too large for Telegram`;
    }
    return (
        `✗  Something went wrong\n\n` +
        `   Please try again later.`
    );
}