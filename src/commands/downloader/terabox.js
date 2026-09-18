// ──────────────────────────────────────────────────
//  BIGSTACK — /terabox Command
//  Download files from Terabox share links
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

// ─── Max size to send directly (20MB) ───────────────
const MAX_SEND_SIZE = 20 * 1024 * 1024;

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "terabox",
    aliases: ["tb", "tbox", "1024terabox"],
    category: "downloader",
    description: "Download files from Terabox share links",
    emoji: "📦",
    usage: "<terabox url>",

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
                `📦 *TERABOX*\n\n` +
                    `Download files from Terabox share links.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}terabox <terabox url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}terabox https://1024terabox.com/s/1yfOUCs9sWC1hYgQIGPP4xw`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ────────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "terabox") {
            return ctx.reply("❌ Please provide a valid *Terabox* share link.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching Terabox share info...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Call service ────────────────────
            logger.info(`[/terabox] user ${ctx.from.id} requesting ${url}`);
            const result = await services.terabox.download(url);

            // ─── 5. Single file? Send it directly ───
            if (result.files.length === 1) {
                const file = result.files[0];

                // Size check
                if (file.size > MAX_SEND_SIZE) {
                    // Too big — send info + link
                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        loading.message_id,
                        `📦 *${file.name}*\n\n` +
                            `📏 *Size:* ${file.sizeFormatted}\n` +
                            `⚠️ *Too large for Telegram* (limit: 20MB)\n\n` +
                            `🔗 [Direct Download Link](${file.download})\n\n` +
                            `📡 *Provider:* ${result.provider}`,
                        { parse_mode: "Markdown", disable_web_page_preview: true }
                    );
                    return;
                }

                // Update loading
                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    `📦 *${file.name}*\n\n` +
                        `📏 *Size:* ${file.sizeFormatted}\n` +
                        `📡 *Provider:* ${result.provider}\n\n` +
                        `📥 Downloading...`,
                    { parse_mode: "Markdown" }
                );

                // Download buffer
                logger.info(`[/terabox] downloading ${file.name} (${file.sizeFormatted})...`);
                const fileRes = await axios.get(file.download, {
                    responseType: "arraybuffer",
                    timeout: 180000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: { "User-Agent": "Mozilla/5.0" }
                });
                const fileBuffer = Buffer.from(fileRes.data);

                // Send based on type
                const caption =
                    `📦 *${file.name}*\n\n` +
                    `📏 *Size:* ${file.sizeFormatted}\n` +
                    `📡 *Provider:* ${result.provider}`;

                await sendFile(ctx, file, fileBuffer, caption);

                // Clean up loading
                await ctx.api
                    .deleteMessage(ctx.chat.id, loading.message_id)
                    .catch(() => {});
            } else {
                // ─── Multiple files ────────────────
                let text =
                    `📦 *Terabox Share*\n\n` +
                    `📊 *Files:* ${result.totalFiles}` +
                    (result.totalFolders > 0 ? ` · *Folders:* ${result.totalFolders}` : "") +
                    `\n📡 *Provider:* ${result.provider}\n\n`;

                // List files
                const listItems = result.files.slice(0, 20);
                for (const f of listItems) {
                    const icon = getFileIcon(f.type);
                    text += `${icon} \`${f.name}\`\n`;
                    text += `    📏 ${f.sizeFormatted}\n`;
                    if (f.download) {
                        text += `    🔗 [Download](${f.download})\n`;
                    }
                    text += "\n";
                }

                if (result.files.length > 20) {
                    text += `_...and ${result.files.length - 20} more files_`;
                }

                await ctx.api.editMessageText(ctx.chat.id, loading.message_id, text, {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true
                });
            }

            logger.info(`[/terabox] ✅ done for ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/terabox] failed: ${error.message}`);

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

// ─── Send file by type ──────────────────────────────
async function sendFile(ctx, file, buffer, caption) {
    const filename = file.name || "file";

    try {
        // Image
        if (file.type === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
            return await ctx.replyWithPhoto(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown"
            });
        }

        // Video
        if (file.type === "video" || /\.(mp4|mkv|mov|avi|webm)$/i.test(filename)) {
            return await ctx.replyWithVideo(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown",
                supports_streaming: true
            });
        }

        // Audio
        if (file.type === "audio" || /\.(mp3|m4a|wav|flac|ogg)$/i.test(filename)) {
            return await ctx.replyWithAudio(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown"
            });
        }

        // Fallback: document
        return await ctx.replyWithDocument(new InputFile(buffer, filename), {
            caption,
            parse_mode: "Markdown"
        });
    } catch (err) {
        logger.warn(`[/terabox] sendFile failed for ${filename}: ${err.message}`);
        // Fall back to document
        return await ctx.replyWithDocument(new InputFile(buffer, filename), {
            caption,
            parse_mode: "Markdown"
        });
    }
}

// ─── File type icon ─────────────────────────────────
function getFileIcon(type) {
    const map = {
        image: "🖼️",
        video: "🎬",
        audio: "🎵",
        file: "📄"
    };
    return map[type] || "📄";
}

// ─── Friendly errors ────────────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All terabox providers failed")) {
        return "❌ *Download failed.*\n\nThe link might be private or expired.";
    }
    if (error.message?.includes("Invalid Terabox URL")) {
        return "❌ *Invalid Terabox URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nThe file is too large or connection is slow.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}