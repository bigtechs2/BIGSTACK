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
    name: "pinterest",
    aliases: ["pin", "pindl"],
    category: "downloader",
    description: "Download Pinterest images and videos",
    emoji: "◈",
    usage: "<pinterest url>",

    permissions: {
        coin: 2,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const url = ctx.args[0]?.trim();

        if (!url) {
            return ctx.reply(
                `◈ *PINTEREST*\n\n` +
                `Download any Pinterest image or video.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}pinterest <pinterest url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}pinterest https://pin.it/40bISo8iE`,
                { parse_mode: "Markdown" }
            );
        }

        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "pinterest") {
            return ctx.reply("✗ Please provide a valid *Pinterest* URL.", {
                parse_mode: "Markdown"
            });
        }

        const progress = await startProgress(ctx, {
            emoji: "◈",
            title: "Fetching from Pinterest...",
            command: "pinterest",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_photo");

            logger.info(`[/pinterest] user ${ctx.from.id} requesting ${url}`);
            const result = await services.pinterest.download(url);

            // ─── LOG the result ──────────────────────
            logger.info(`[/pinterest] provider=${result.provider} type=${result.type} url=${result.download?.slice(0, 60)}`);

            progress.setProvider(result.provider);
            progress.setTitle(`Downloading ${result.type}...`);

            // ─── Download image with retries ─────────
            logger.info(`[/pinterest] downloading from ${result.download}...`);

            let mediaBuffer;
            try {
                const mediaRes = await axios.get(result.download, {
                    responseType: "arraybuffer",
                    timeout: 30000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Referer": "https://www.pinterest.com/",
                        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
                    }
                });
                mediaBuffer = Buffer.from(mediaRes.data);
                logger.info(`[/pinterest] downloaded ${mediaBuffer.length} bytes`);
            } catch (downloadErr) {
                logger.error(`[/pinterest] download failed: ${downloadErr.message}`);

                // Fallback: try the thumbnail
                if (result.thumbnail && result.thumbnail !== result.download) {
                    logger.info(`[/pinterest] trying thumbnail fallback...`);
                    const thumbRes = await axios.get(result.thumbnail, {
                        responseType: "arraybuffer",
                        timeout: 30000,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                        }
                    });
                    mediaBuffer = Buffer.from(thumbRes.data);
                } else {
                    throw downloadErr;
                }
            }

            // ─── Build caption ───────────────────────
            const title = result.title && result.title !== "(no title)"
                ? result.title
                : "Pinterest Pin";

            const caption =
                `◈ *${truncate(title, 100)}*\n\n` +
                (result.channel && result.channel !== "Unknown"
                    ? `◉ Author    ➤  ${result.channel}\n`
                    : "") +
                `⊛ Provider  ➤  ${result.provider}`;

            // ─── Send ────────────────────────────────
            if (result.type === "video") {
                await ctx.replyWithVideo(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId || Date.now()}.mp4`),
                    {
                        caption,
                        parse_mode: "Markdown",
                        supports_streaming: true
                    }
                );
            } else {
                await ctx.replyWithPhoto(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId || Date.now()}.jpg`),
                    {
                        caption,
                        parse_mode: "Markdown"
                    }
                );
            }

            await progress.finish({
                success: true,
                title: "Sent",
                extra:
                    `◈ Pinterest ${result.type}\n` +
                    `📡 ${result.provider}`
            });

            logger.info(`[/pinterest] ✓ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/pinterest] failed: ${error.message}`);
            logger.error(`[/pinterest] stack: ${error.stack?.slice(0, 500)}`);

            const errorText = getErrorMessage(error);

            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: errorText
            });
        }
    }
};

// ─── Helper: truncate ───────────────────────────────
function truncate(str, max = 100) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

// ─── Helper: friendly errors ────────────────────────
function getErrorMessage(error) {
    const msg = error.message || "";

    if (msg.includes("All pinterest providers failed")) {
        return "✗  Download failed\n\n   This pin might be private or unavailable.";
    }
    if (msg.includes("Invalid Pinterest URL")) {
        return "✗  Invalid Pinterest URL";
    }
    if (error.response?.status === 429) {
        return "◐  Rate limited\n\n   Please wait a minute.";
    }
    if (error.code === "ECONNABORTED" || msg.includes("timeout")) {
        return "◕  Download timeout\n\n   Connection too slow or blocked.";
    }
    if (error.response?.status === 403 || msg.includes("403")) {
        return "✗  Pinterest blocked the request\n\n   Try again in a moment.";
    }
    if (error.response?.status === 404) {
        return "✗  Pin not found";
    }

    return `✗  Something went wrong\n\n   ${msg.slice(0, 100)}`;
}