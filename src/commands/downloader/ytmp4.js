const { InputFile } = require("grammy");
const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");
const { convertMedia } = require("../../utils/mediaConverter");

module.exports = {
    name: "ytmp4",
    aliases: ["mp4", "ytvideo", "ytv"],
    category: "downloader",
    description: "Download YouTube video as MP4",
    emoji: "▣",
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

        if (!url) {
            return ctx.reply(`▣ *YTMP4*\n\nUsage:\n${config.prefix}ytmp4 <youtube url>`, { parse_mode: "Markdown" });
        }

        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "youtube") {
            return ctx.reply("✗ Please provide a valid YouTube link.", { parse_mode: "Markdown" });
        }

        const progress = await startProgress(ctx, {
            emoji: "▣",
            title: "Fetching MP4...",
            command: "ytmp4",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_video");
            logger.info(`[/ytmp4] user ${ctx.from.id} requesting ${url}`);
            
            const result = await services.ytmp4.download(url);
            progress.setProvider(result.provider);
            progress.setTitle(`Downloading video...`);

            // Download raw buffer
            const videoRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 45000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const rawBuffer = Buffer.from(videoRes.data);

            // Convert to perfect H.264 MP4
            progress.setTitle("Converting to MP4...");
            const videoBuffer = await convertMedia(rawBuffer, "mp4");

            const caption =
                `▣ *${result.title}*\n\n` +
                (result.channel ? `◉ *Author:* ${result.channel}\n` : "") +
                (result.duration ? `◐ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `⊛ *Provider:* ${result.provider}`;

            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `${sanitize(result.title)}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true,
                    thumbnail: result.thumbnail || undefined
                }
            );

            await progress.finish({
                success: true,
                title: "Video Sent!",
                extra: `▣ ${truncate(result.title, 50)}`
            });

        } catch (error) {
            logger.error(`[/ytmp4] failed: ${error.message}`);
            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: getErrorMessage(error)
            });
        }
    }
};

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}
function sanitize(str) {
    return (str || "video").replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 60);
}
function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : str;
}
function getErrorMessage(error) {
    if (error.message?.includes("All ytmp4 providers failed")) return "❌ *Download failed.*";
    if (error.code === "ECONNABORTED") return "⌛ *Download timeout.*";
    return "❌ *Something went wrong.*";
}