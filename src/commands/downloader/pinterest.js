// ──────────────────────────────────────────────────
//  BIGSTACK — /pinterest Command
//  Download images / videos from Pinterest
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
    name: "pinterest",
    aliases: ["pin", "pindl"],
    category: "downloader",
    description: "Download Pinterest images and videos",
    emoji: "📌",
    usage: "<pinterest url>",

    permissions: {
        coin: 3,
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
                `📌 *PINTEREST*\n\n` +
                    `Download any Pinterest image or video.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}pinterest <pinterest url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}pinterest https://pin.it/40bISo8iE`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate Pinterest URL ──────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "pinterest") {
            return ctx.reply("❌ Please provide a valid *Pinterest* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "📌",
            title: "Fetching from Pinterest...",
            command: "pinterest",
            input: url
        });

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_photo");

            // ─── 5. Call service ────────────────────
            logger.info(`[/pinterest] user ${ctx.from.id} requesting ${url}`);
            const result = await services.pinterest.download(url);

            // ─── 6. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle(`Downloading ${result.type}...`);

            // ─── 7. Download buffer ─────────────────
            logger.info(`[/pinterest] downloading ${result.type} from ${result.provider}...`);
            const mediaRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const mediaBuffer = Buffer.from(mediaRes.data);

            // ─── 8. Build caption ───────────────────
            const caption =
                `📌 *${truncate(result.title, 100)}*\n\n` +
                (result.channel && result.channel !== "Unknown"
                    ? `👤 *Author:* ${result.channel}\n`
                    : "") +
                `📡 *Provider:* ${result.provider}`;

            // ─── 9. Send based on type ──────────────
            if (result.type === "video") {
                await ctx.replyWithVideo(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId}.mp4`),
                    {
                        caption,
                        parse_mode: "Markdown",
                        supports_streaming: true
                    }
                );
            } else {
                await ctx.replyWithPhoto(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId}.jpg`),
                    {
                        caption,
                        parse_mode: "Markdown"
                    }
                );
            }

            // ─── 10. Final success ──────────────────
            await progress.finish({
                success: true,
                title: "Sent!",
                extra:
                    `📌 Pinterest ${capitalize(result.type)}\n` +
                    `🎯 Pin: \`${result.pinId}\``
            });

            logger.info(`[/pinterest] ✅ sent ${result.type} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/pinterest] failed: ${error.message}`);

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
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function truncate(str, max = 100) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

function getErrorMessage(error) {
    if (error.message?.includes("All pinterest providers failed")) {
        return "❌ *Download failed.*\n\nThis pin might be private or unavailable.";
    }
    if (error.message?.includes("Invalid Pinterest URL")) {
        return "❌ *Invalid Pinterest URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}