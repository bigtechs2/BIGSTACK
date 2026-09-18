// ──────────────────────────────────────────────────
//  BIGSTACK — /gdrive Command
//  Download files from Google Drive (auto-detect type)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

// ─── Max size to send via Telegram (20MB) ───────────
const MAX_SEND_SIZE = 20 * 1024 * 1024;

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "gdrive",
    aliases: ["gd", "drive", "googledrive"],
    category: "downloader",
    description: "Download files from Google Drive",
    emoji: "📂",
    usage: "<google drive url>",

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
                `📂 *GOOGLE DRIVE*\n\n` +
                    `Download any file from Google Drive.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}gdrive <google drive url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}gdrive https://drive.google.com/file/d/FILE_ID/view`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ────────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "gdrive") {
            return ctx.reply("❌ Please provide a valid *Google Drive* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching from Google Drive...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_document");

            // ─── 5. Call service ────────────────────
            logger.info(`[/gdrive] user ${ctx.from.id} requesting ${url}`);
            const result = await services.gdrive.download(url);

            // ─── 6. Size check ──────────────────────
            if (result.size > MAX_SEND_SIZE) {
                // Too large — send info + link
                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    `📂 *${result.filename}*\n\n` +
                        `📏 *Size:* ${result.sizeFormatted}\n` +
                        `🏷 *Type:* ${result.type}\n` +
                        `⚠️ *Too large for Telegram* (limit: 20MB)\n\n` +
                        `🔗 [Download Link](${result.download})\n\n` +
                        `📡 *Provider:* ${result.provider}`,
                    { parse_mode: "Markdown", disable_web_page_preview: true }
                );
                return;
            }

            // ─── 7. Update loading ──────────────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `📂 *${result.filename}*\n\n` +
                    `📏 *Size:* ${result.sizeFormatted}\n` +
                    `🏷 *Type:* ${result.type}\n` +
                    `📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading...`,
                { parse_mode: "Markdown" }
            );

            // ─── 8. Download buffer ─────────────────
            logger.info(`[/gdrive] downloading ${result.filename} (${result.sizeFormatted})...`);
            const fileRes = await axios.get(result.download, {
                responseType: "arraybuffer",
                timeout: 180000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            const fileBuffer = Buffer.from(fileRes.data);

            // ─── 9. Build caption ───────────────────
            const caption =
                `📂 *${result.filename}*\n\n` +
                `📏 *Size:* ${result.sizeFormatted}\n` +
                `📡 *Provider:* ${result.provider}`;

            // ─── 10. Send based on type ─────────────
            await sendByType(ctx, result, fileBuffer, caption);

            // ─── 11. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/gdrive] ✅ sent ${result.filename} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/gdrive] failed: ${error.message}`);

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
                performer: "Google Drive"
            });
        }

        // 📄 Everything else (pdf, zip, doc, etc.) → send as document
        return await ctx.replyWithDocument(new InputFile(buffer, name), {
            caption,
            parse_mode: "Markdown"
        });

    } catch (err) {
        logger.warn(`[/gdrive] sendByType failed (${type}): ${err.message}`);

        // Fallback: try as document
        try {
            return await ctx.replyWithDocument(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown"
            });
        } catch (fallbackErr) {
            logger.error(`[/gdrive] document fallback failed: ${fallbackErr.message}`);
            throw new Error("Could not send file to Telegram");
        }
    }
}

// ─── Friendly errors ────────────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All gdrive providers failed")) {
        return "❌ *Download failed.*\n\nThe file might be private or the link is invalid.";
    }
    if (error.message?.includes("Invalid Google Drive URL")) {
        return "❌ *Invalid Google Drive URL.*";
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
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}