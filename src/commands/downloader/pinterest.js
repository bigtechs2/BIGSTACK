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
                `◈ PINTEREST\n\n` +
                `Download any Pinterest image or video.\n\n` +
                `▸ Usage\n` +
                `   ${config.prefix}pinterest <pinterest url>\n\n` +
                `▸ Example\n` +
                `   ${config.prefix}pinterest https://pin.it/40bISo8iE`
            );
        }

        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "pinterest") {
            return ctx.reply("✗ Please provide a valid Pinterest URL.");
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

            logger.info(`[/pinterest] provider=${result.provider} type=${result.type}`);

            progress.setProvider(result.provider);
            progress.setTitle(`Downloading ${result.type}...`);

            // ─── Download image ──────────────────────
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
                        "Referer": "https://www.pinterest.com/"
                    }
                });
                mediaBuffer = Buffer.from(mediaRes.data);
                logger.info(`[/pinterest] downloaded ${mediaBuffer.length} bytes`);
            } catch (downloadErr) {
                logger.error(`[/pinterest] download failed: ${downloadErr.message}`);
                if (result.thumbnail && result.thumbnail !== result.download) {
                    const thumbRes = await axios.get(result.thumbnail, {
                        responseType: "arraybuffer",
                        timeout: 30000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    mediaBuffer = Buffer.from(thumbRes.data);
                } else {
                    throw downloadErr;
                }
            }

            // ─── Plain caption (no markdown) ─────────
            const title = result.title && result.title !== "(no title)"
                ? result.title
                : "Pinterest Pin";

            const plainCaption =
                `◈ ${truncate(title, 100)}\n\n` +
                (result.channel && result.channel !== "Unknown"
                    ? `◉ Author   ➤  ${result.channel}\n`
                    : "") +
                `⊛ Provider ➤  ${result.provider}`;

            // ─── Send ────────────────────────────────
            if (result.type === "video") {
                await ctx.replyWithVideo(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId || Date.now()}.mp4`),
                    {
                        caption: plainCaption,
                        supports_streaming: true
                    }
                );
            } else {
                await ctx.replyWithPhoto(
                    new InputFile(mediaBuffer, `pinterest_${result.pinId || Date.now()}.jpg`),
                    { caption: plainCaption }
                );
            }

            await progress.finish({
                success: true,
                title: "Sent",
                extra: `◈ Pinterest ${result.type}\n📡 ${result.provider}`
            });

            logger.info(`[/pinterest] ✓ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/pinterest] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: getErrorMessage(error)
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
        return "✗ Download failed ⏤ pin unavailable";
    }
    if (msg.includes("Invalid Pinterest URL")) {
        return "✗ Invalid Pinterest URL";
    }
    if (msg.includes("can't parse entities")) {
        return "✗ Title contains unsupported characters";
    }
    if (error.response?.status === 429) {
        return "◐ Rate limited ⏤ try again in a minute";
    }
    if (error.code === "ECONNABORTED" || msg.includes("timeout")) {
        return "◕ Download timeout ⏤ connection too slow";
    }
    if (error.response?.status === 403) {
        return "✗ Pinterest blocked the request";
    }
    if (error.response?.status === 404) {
        return "✗ Pin not found";
    }

    return `✗ ${msg.slice(0, 100)}`;
}