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

// ─── Max size to send via Telegram (20MB) ───────────
const MAX_SEND_SIZE = 20 * 1024 * 1024;

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

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching from MediaFire...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_document");

            // ─── 5. Call service ────────────────────
            logger.info(`[/mediafire] user ${ctx.from.id} requesting ${url}`);
            const result = await services.mediafire.download(url);

            // ─── 6. Size check ──────────────────────
            if (result.size > MAX_SEND_SIZE) {
                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    `🔥 *${result.filename}*\n\n` +
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
                `🔥 *${result.filename}*\n\n` +
                    `📏 *Size:* ${result.sizeFormatted}\n` +
                    `🏷 *Type:* ${result.type}\n` +
                    `📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading...`,
                { parse_mode: "Markdown" }
            );

            // ─── 8. Download buffer ─────────────────
            logger.info(`[/mediafire] downloading ${result.filename} (${result.sizeFormatted})...`);
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
                `🔥 *${result.filename}*\n\n` +
                `📏 *Size:* ${result.sizeFormatted}\n` +
                `📡 *Provider:* ${result.provider}`;

            // ─── 10. Send based on type ─────────────
            await sendByType(ctx, result, fileBuffer, caption);

            // ─── 11. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/mediafire] ✅ sent ${result.filename} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/mediafire] failed: ${error.message}`);

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
        if (type === "image") {
            return await ctx.replyWithPhoto(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown"
            });
        }

        if (type === "video") {
            return await ctx.replyWithVideo(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown",
                supports_streaming: true
            });
        }

        if (type === "audio") {
            return await ctx.replyWithAudio(new InputFile(buffer, name), {
                caption,
                parse_mode: "Markdown",
                title: name.replace(/\.[^.]+$/, ""),
                performer: "MediaFire"
            });
        }

        // Everything else (zip, pdf, doc, etc.) → document
        return await ctx.replyWithDocument(new InputFile(buffer, name), {
            caption,
            parse_mode: "Markdown"
        });

    } catch (err) {
        logger.warn(`[/mediafire] sendByType failed (${type}): ${err.message}`);

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
        return "❌ *Download failed.*\n\nThe file might be private or the link is invalid.";
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
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}