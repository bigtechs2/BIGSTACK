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
const { startProgress } = require("../../utils/progress");

// ─── Max size to send via Telegram (from config) ────
const MAX_SEND_SIZE = (config.limits?.maxSendSizeMB || 30) * 1024 * 1024;

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

        // ─── 3. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "📦",
            title: "Fetching Terabox share info...",
            command: "terabox",
            input: url
        });

        try {
            // ─── 4. Call service ────────────────────
            logger.info(`[/terabox] user ${ctx.from.id} requesting ${url}`);
            const result = await services.terabox.download(url);

            // ─── 5. Update progress ─────────────────
            progress.setProvider(result.provider);

            // ─── 6. Single file? Send it directly ───
            if (result.files.length === 1) {
                const file = result.files[0];

                progress.setTitle(`${file.name}`);

                // Size check → too large
                if (file.size > MAX_SEND_SIZE) {
                    const sizeLimitMB = Math.round(MAX_SEND_SIZE / (1024 * 1024));

                    await progress.finish({
                        success: true,
                        title: "File Ready (Too Large)",
                        extra:
                            `📏 *Size:* ${file.sizeFormatted}\n` +
                            `⚠️ _Too large for Telegram_ (limit: ${sizeLimitMB}MB)\n\n` +
                            `🔗 [Direct Download Link](${file.download})`
                    });
                    return;
                }

                // Update → downloading
                progress.setTitle("Downloading file...");

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

                // Final success
                await progress.finish({
                    success: true,
                    title: "File Sent!",
                    extra:
                        `📦 ${truncate(file.name, 50)}\n` +
                        `📏 ${file.sizeFormatted}`
                });

            } else {
                // ─── Multiple files ────────────────
                progress.setTitle(`${result.totalFiles} file(s) found`);

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

                text += `\n${config.footer}`;

                await progress.finish({
                    success: true,
                    title: "Terabox Share",
                    text
                });
            }

            logger.info(`[/terabox] ✅ done for ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/terabox] failed: ${error.message}`);

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

// ─── Send file by type ──────────────────────────────
async function sendFile(ctx, file, buffer, caption) {
    const filename = file.name || "file";

    try {
        // 🖼️ Image
        if (file.type === "image" || /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
            return await ctx.replyWithPhoto(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown"
            });
        }

        // 🎬 Video
        if (file.type === "video" || /\.(mp4|mkv|mov|avi|webm)$/i.test(filename)) {
            return await ctx.replyWithVideo(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown",
                supports_streaming: true
            });
        }

        // 🎵 Audio
        if (file.type === "audio" || /\.(mp3|m4a|wav|flac|ogg)$/i.test(filename)) {
            return await ctx.replyWithAudio(new InputFile(buffer, filename), {
                caption,
                parse_mode: "Markdown"
            });
        }

        // 📄 Fallback: document
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

// ─── Truncate ───────────────────────────────────────
function truncate(str, max = 50) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
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
    if (error.message?.includes("request entity too large")) {
        return "❌ *File too large for Telegram.*";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}