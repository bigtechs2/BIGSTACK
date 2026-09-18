// ──────────────────────────────────────────────────
//  BIGSTACK — /facebook Command
//  Download Facebook videos (HD preferred)
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
    name: "facebook",
    aliases: ["fb", "fbdl"],
    category: "downloader",
    description: "Download Facebook videos (HD quality)",
    emoji: "📘",
    usage: "<facebook url>",

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
                `📘 *FACEBOOK*\n\n` +
                    `Download Facebook videos in HD quality.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}facebook <facebook url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}facebook https://www.facebook.com/share/v/15fNp5gHK4/`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate Facebook URL ───────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "facebook") {
            return ctx.reply("❌ Please provide a valid *Facebook* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "📘",
            title: "Fetching Facebook video...",
            command: "facebook",
            input: url
        });

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_video");

            // ─── 5. Call service ────────────────────
            logger.info(`[/facebook] user ${ctx.from.id} requesting ${url}`);
            const result = await services.facebook.download(url);

            // ─── 6. Update progress with provider ───
            progress.setProvider(result.provider);
            progress.setTitle(`Downloading ${result.quality.toUpperCase()} video...`);

            // ─── 7. Download buffer ─────────────────
            logger.info(`[/facebook] downloading ${result.quality} from ${result.provider}...`);
            const videoRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 180000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.facebook.com/"
                }
            });
            const videoBuffer = Buffer.from(videoRes.data);

            // ─── 8. Build caption ───────────────────
            const caption =
                `📘 *${result.title}*\n\n` +
                `🎞 *Quality:* ${result.quality.toUpperCase()}\n` +
                (result.duration ? `⏱ *Duration:* ${formatDuration(result.duration)}\n` : "") +
                `📡 *Provider:* ${result.provider}`;

            // ─── 9. Send video ──────────────────────
            await ctx.replyWithVideo(
                new InputFile(videoBuffer, `facebook_${result.videoId}.mp4`),
                {
                    caption,
                    parse_mode: "Markdown",
                    supports_streaming: true,
                    thumbnail: result.thumbnail || undefined
                }
            );

            // ─── 10. Final success ──────────────────
            await progress.finish({
                success: true,
                title: "Video Sent!",
                extra: `🎞 ${result.quality.toUpperCase()} · ${truncate(result.title, 50)}`
            });

            logger.info(`[/facebook] ✅ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/facebook] failed: ${error.message}`);

            const errorText = getErrorMessage(error);

            // ─── Final error ────────────────────────
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
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

function getErrorMessage(error) {
    if (error.message?.includes("All facebook providers failed")) {
        return "❌ *Download failed.*\n\nThis video might be private or unavailable.";
    }
    if (error.message?.includes("Invalid Facebook URL")) {
        return "❌ *Invalid Facebook URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nThe video is too large or connection is slow.";
    }
    if (error.message?.includes("request entity too large")) {
        return "❌ *Video too large for Telegram.*\n\nTry again later or use a smaller quality.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}