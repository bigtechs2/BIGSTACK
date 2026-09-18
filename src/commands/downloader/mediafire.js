// ──────────────────────────────────────────────────
//  BIGSTACK — /mediafire Command
//  Download files from MediaFire
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

// ─── Max size to send via Telegram (from config) ────
const MAX_SEND_SIZE = (config.limits?.maxSendSizeMB || 30) * 1024 * 1024;

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "mediafire",
    aliases: ["mf", "mfdl"],
    category: "downloader",
    description: "Download files from MediaFire",
    emoji: "🔥",
    usage: "<mediafire url>",

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
                `🔥 *MEDIAFIRE*\n\n` +
                    `Download any file from MediaFire.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}mediafire <mediafire url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}mediafire https://www.mediafire.com/file/xxx/file.zip`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ────────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "mediafire") {
            return ctx.reply("❌ Please provide a valid *MediaFire* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "🔥",
            title: "Fetching from MediaFire...",
            command: "mediafire",
            input: url
        });

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_document");

            // ─── 5. Call service ────────────────────
            logger.info(`[/mediafire] user ${ctx.from.id} requesting ${url}`);
            const result = await services.mediafire.download(url);

            // ─── 6. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle(`${result.filename}`);

            // ─── 7. Size check → too large ──────────
            if (result.size > MAX_SEND_SIZE) {
                const sizeLimitMB = Math.round(MAX_SEND_SIZE / (1024 * 1024));

                await progress.finish({
                    success: true,
                    title: "File Ready (Too Large)",
                    extra:
                        `📏 *Size:* ${result.sizeFormatted}\n` +
                        `🏷 *Type:* ${result.type}\n` +
                        (result.uploaded ? `📅 *Uploaded:* ${result.uploaded}\n` : "") +
                        `⚠️ _Too large for Telegram_ (limit: ${sizeLimitMB}MB)\n\n` +
                        `🔗 [Download Link](${result.download})`
                });
                return;
            }

            // ─── 8. Update progress → downloading ───
            progress.setTitle("Downloading file...");

            // ─── 9. Download buffer ─────────────────
            logger.info(`[/mediafire] downloading ${result.filename} (${result.sizeFormatted})...`);
            const fileRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 180000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.mediafire.com/"
                }
            });
            const fileBuffer = Buffer.from(fileRes.data);

            // ─── 10. Build caption ──────────────────
            const caption =
                `🔥 *${result.filename}*\n\n` +
                `📏 *Size:* ${result.sizeFormatted}\n` +
                `📡 *Provider:* ${result.provider}`;

            // ─── 11. Send based on type ─────────────
            await sendByType(ctx, result, fileBuffer, caption);

            // ─── 12. Final success ──────────────────
            await progress.finish({
                success: true,
                title: "File Sent!",
                extra:
                    `📏 *Size:* ${result.sizeFormatted}\n` +
                    `🏷 *Type:* ${result.type}`
            });

            logger.info(`[/mediafire] ✅ sent ${result.filename} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/mediafire] failed: ${error.message}`);

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

// ─── Send file by detected type ─────────────────────
async function sendByType(ctx, result, buffer, caption) {
    const { type, filename } = result;
    const name = filename || "file";

    try {
        // 🖼️ Image → send as photo
        if (type === "image") {
            return await ctx.replyWithPhoto(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown"
            });
        }

        // 🎬 Video → send as video
        if (type === "video") {
            return await ctx.replyWithVideo(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown",
                supports_streaming: true
            });
        }

        // 🎵 Audio → send as audio
        if (type === "audio") {
            return await ctx.replyWithAudio(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown",
                title: name.replace(/\.[^.]+$/, ""),
                performer: "MediaFire"
            });
        }

        // 📄 Everything else (zip, pdf, doc, etc.) → document
        return await ctx.replyWithDocument(new InputFile(buffer, name), {
            caption,
            parse_mode: "Markdown"
        });

    } catch (err) {
        logger.warn(`[/mediafire] sendByType failed (${type}): ${err.message}`);

        // Fallback: try as document
        try {
            return await ctx.replyWithDocument(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown"
            });
        } catch (fallbackErr) {
            logger.error(`[/mediafire] document fallback failed: ${fallbackErr.message}`);
            throw new Error("Could not send file to Telegram");
        }
    }
}

// ─── Friendly errors ────────────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All mediafire providers failed")) {
        return "❌ *Download failed.*\n\nThe file might be deleted or the link is invalid.";
    }
    if (error.message?.includes("Invalid MediaFire URL")) {
        return "❌ *Invalid MediaFire URL.*";
    }
    if (error.message?.includes("Could not send file")) {
        return "❌ *File couldn't be sent.*\n\nIt may be corrupted or too large.";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nThe file is too large or connection is slow.";
    }
    if (error.message?.includes("request entity too large")) {
        return "❌ *File too large for Telegram.*";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}