// ──────────────────────────────────────────────────
//  BIGSTACK — /github Command
//  Download GitHub repositories as ZIP / TAR
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
    name: "github",
    aliases: ["gh", "ghdl", "repo"],
    category: "downloader",
    description: "Download GitHub repositories as ZIP or TAR",
    emoji: "🐙",
    usage: "<github repo url> [zip|tar]",

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
        const format = (ctx.args[1]?.trim() || "zip").toLowerCase();

        // ─── 1. Validate input ──────────────────────
        if (!url) {
            return ctx.reply(
                `🐙 *GITHUB*\n\n` +
                    `Download any GitHub repository.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}github <repo url> [zip|tar]\n\n` +
                    `*Examples:*\n` +
                    `${config.prefix}github https://github.com/user/repo\n` +
                    `${config.prefix}github https://github.com/user/repo tar`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ────────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "github") {
            return ctx.reply("❌ Please provide a valid *GitHub* repository URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Validate format ─────────────────────
        if (!["zip", "tar"].includes(format)) {
            return ctx.reply("❌ Format must be either `zip` or `tar`.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 4. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching repo info from GitHub...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 5. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_document");

            // ─── 6. Call service ────────────────────
            logger.info(`[/github] user ${ctx.from.id} requesting ${url} (${format})`);
            const result = await services.github.download(url, format);

            // ─── 7. Build info text ─────────────────
            const infoLines = [
                `🐙 *${result.fullName}*`,
                ""
            ];

            if (result.description) {
                infoLines.push(`📝 ${result.description}`);
                infoLines.push("");
            }

            infoLines.push(`⭐ *Stars:* ${result.stars}`);
            infoLines.push(`🍴 *Forks:* ${result.forks}`);
            infoLines.push(`💻 *Language:* ${result.language}`);
            infoLines.push(`🌿 *Branch:* ${result.branch}`);

            if (result.sizeFormatted && result.sizeFormatted !== "Unknown") {
                infoLines.push(`📏 *Size:* ${result.sizeFormatted}`);
            }

            infoLines.push(`📦 *Format:* ${format.toUpperCase()}`);
            infoLines.push(`📡 *Provider:* ${result.provider}`);
            infoLines.push("");

            // ─── 8. Size check ──────────────────────
            if (result.size > MAX_SEND_SIZE) {
                infoLines.push(`⚠️ *Too large for Telegram* (limit: 20MB)`);
                infoLines.push("");
                infoLines.push(`🔗 [Download Link](${result.download})`);

                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    infoLines.join("\n"),
                    { parse_mode: "Markdown", disable_web_page_preview: true }
                );
                return;
            }

            // ─── 9. Update loading with download ────
            infoLines.push(`📥 Downloading...`);

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                infoLines.join("\n"),
                { parse_mode: "Markdown" }
            );

            // ─── 10. Download buffer ────────────────
            logger.info(`[/github] downloading ${result.filename}...`);
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

            // ─── 11. Build caption ──────────────────
            const caption =
                `🐙 *${result.fullName}*\n\n` +
                (result.description ? `${result.description}\n\n` : "") +
                `⭐ ${result.stars} · 🍴 ${result.forks} · 💻 ${result.language}\n` +
                `🌿 ${result.branch} · 📦 ${format.toUpperCase()}`;

            // ─── 12. Send as document ───────────────
            await ctx.replyWithDocument(
                new InputFile(fileBuffer, result.filename),
                {
                    caption,
                    parse_mode: "Markdown"
                }
            );

            // ─── 13. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/github] ✅ sent ${result.filename} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/github] failed: ${error.message}`);

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

// ─── Friendly errors ────────────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All github providers failed")) {
        return "❌ *Download failed.*\n\nThe repo might be private or doesn't exist.";
    }
    if (error.message?.includes("Invalid GitHub URL")) {
        return "❌ *Invalid GitHub URL.*";
    }
    if (error.message?.includes("Could not parse")) {
        return "❌ *Invalid GitHub URL format.*\n\nMake sure it looks like:\n`https://github.com/user/repo`";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nThe repo is too large or connection is slow.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}