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
const { startProgress } = require("../../utils/progress");

// ─── Max size to send via Telegram (from config) ────
const MAX_SEND_SIZE = (config.limits?.maxSendSizeMB || 30) * 1024 * 1024;

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

        // ─── 4. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "🐙",
            title: "Fetching repo info...",
            command: "github",
            input: `${url} ${format}`
        });

        try {
            // ─── 5. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_document");

            // ─── 6. Call service ────────────────────
            logger.info(`[/github] user ${ctx.from.id} requesting ${url} (${format})`);
            const result = await services.github.download(url, format);

            // ─── 7. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle(`${result.fullName}`);

            // ─── 8. Size check ──────────────────────
            if (result.size > MAX_SEND_SIZE) {
                const sizeLimitMB = Math.round(MAX_SEND_SIZE / (1024 * 1024));

                await progress.finish({
                    success: true,
                    title: "Repo Ready (Too Large)",
                    extra:
                        (result.description ? `📝 ${truncate(result.description, 100)}\n\n` : "") +
                        `⭐ ${result.stars} · 🍴 ${result.forks} · 💻 ${result.language}\n` +
                        `🌿 ${result.branch} · 📦 ${format.toUpperCase()}\n` +
                        `📏 *Size:* ${result.sizeFormatted}\n` +
                        `⚠️ _Too large for Telegram_ (limit: ${sizeLimitMB}MB)\n\n` +
                        `🔗 [Download Link](${result.download})`
                });
                return;
            }

            // ─── 9. Update progress → downloading ───
            progress.setTitle("Downloading repo...");

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

            // ─── 13. Final success ──────────────────
            await progress.finish({
                success: true,
                title: "Repo Sent!",
                extra:
                    `🐙 ${result.fullName}\n` +
                    `⭐ ${result.stars} · 🍴 ${result.forks}\n` +
                    `🌿 ${result.branch} · 📦 ${format.toUpperCase()}`
            });

            logger.info(`[/github] ✅ sent ${result.filename} to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/github] failed: ${error.message}`);

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

// ─── Helper: truncate ───────────────────────────────
function truncate(str, max = 100) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

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
    if (error.message?.includes("request entity too large")) {
        return "❌ *Repo too large for Telegram.*\n\nTry again later.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}