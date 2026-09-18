// ──────────────────────────────────────────────────
//  BIGSTACK — /instagram Command
//  Download Instagram posts, reels, carousels
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile, InputMediaBuilder } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "instagram",
    aliases: ["ig", "insta", "igdl"],
    category: "downloader",
    description: "Download Instagram posts, reels and carousels",
    emoji: "📸",
    usage: "<instagram url>",

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
                `📸 *INSTAGRAM*\n\n` +
                    `Download Instagram posts, reels, and carousels.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}instagram <instagram url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}instagram https://www.instagram.com/reel/DZMn2xkvJNo/`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate Instagram URL ──────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "instagram") {
            return ctx.reply("❌ Please provide a valid *Instagram* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Start live progress ─────────────────
        const progress = await startProgress(ctx, {
            emoji: "📸",
            title: "Fetching from Instagram...",
            command: "instagram",
            input: url
        });

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_photo");

            // ─── 5. Call service ────────────────────
            logger.info(`[/instagram] user ${ctx.from.id} requesting ${url}`);
            const result = await services.instagram.download(url);

            // ─── 6. Update progress with info ───────
            progress.setProvider(result.provider);
            progress.setTitle(
                `Downloading ${result.count} item${result.count > 1 ? "s" : ""}...`
            );

            // ─── 7. Download all media buffers ──────
            logger.info(`[/instagram] downloading ${result.count} item(s)...`);
            const buffers = await downloadAll(result.items, progress);

            if (buffers.length === 0) {
                throw new Error("All media items failed to download");
            }

            // ─── 8. Send based on count ─────────────
            if (buffers.length === 1) {
                await sendSingle(ctx, buffers[0], result);
            } else if (buffers.length > 1 && buffers.length <= 10) {
                await sendMediaGroup(ctx, buffers, result);
            } else {
                const first10 = buffers.slice(0, 10);
                await sendMediaGroup(ctx, first10, result);

                for (const buf of buffers.slice(10)) {
                    await sendSingle(ctx, buf, result);
                }
            }

            // ─── 9. Final success ───────────────────
            await progress.finish({
                success: true,
                title: "Sent!",
                extra:
                    `📸 Instagram ${capitalize(result.type)}\n` +
                    `📦 *Items:* ${buffers.length}/${result.count}`
            });

            logger.info(`[/instagram] ✅ sent ${buffers.length} item(s) to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/instagram] failed: ${error.message}`);

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

// ─── Download all buffers in parallel ───────────────
async function downloadAll(items, progress) {
    let done = 0;
    const total = items.length;

    const promises = items.map(async (item, i) => {
        try {
            const res = await axios.get(item.url, {
                responseType: "arraybuffer",
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            done++;

            // Update progress title with item count
            if (progress && total > 1) {
                progress.setTitle(`Downloading ${done}/${total} items...`);
            }

            return {
                type: item.type,
                buffer: Buffer.from(res.data),
                thumbnail: item.thumbnail,
                index: i
            };
        } catch (err) {
            logger.warn(`[/instagram] item ${i} download failed: ${err.message}`);
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter((r) => r !== null);
}

// ─── Send a single item ─────────────────────────────
async function sendSingle(ctx, item, result) {
    const caption = buildCaption(result);

    if (item.type === "video") {
        await ctx.replyWithVideo(
            new InputFile(item.buffer, `instagram_${result.shortcode}.mp4`),
            {
                caption,
                parse_mode: "Markdown",
                supports_streaming: true
            }
        );
    } else {
        await ctx.replyWithPhoto(
            new InputFile(item.buffer, `instagram_${result.shortcode}.jpg`),
            { caption, parse_mode: "Markdown" }
        );
    }
}

// ─── Send multiple items as media group ─────────────
async function sendMediaGroup(ctx, buffers, result) {
    const media = buffers.map((item, i) => {
        const isFirst = i === 0;
        const caption = isFirst ? buildCaption(result) : undefined;

        if (item.type === "video") {
            return InputMediaBuilder.video(
                new InputFile(item.buffer, `instagram_${result.shortcode}_${i}.mp4`),
                { caption, parse_mode: "Markdown" }
            );
        } else {
            return InputMediaBuilder.photo(
                new InputFile(item.buffer, `instagram_${result.shortcode}_${i}.jpg`),
                { caption, parse_mode: "Markdown" }
            );
        }
    });

    await ctx.replyWithMediaGroup(media);
}

// ─── Build caption ──────────────────────────────────
function buildCaption(result) {
    return (
        `📸 *Instagram ${capitalize(result.type)}*\n\n` +
        `📦 *Items:* ${result.count}\n` +
        `📡 *Provider:* ${result.provider}`
    );
}

// ─── Helpers ────────────────────────────────────────
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getErrorMessage(error) {
    if (error.message?.includes("All instagram providers failed")) {
        return "❌ *Download failed.*\n\nThis post might be private or unavailable.";
    }
    if (error.message?.includes("All media items failed")) {
        return "❌ *Download failed.*\n\nCould not fetch any media items.";
    }
    if (error.message?.includes("Invalid Instagram URL")) {
        return "❌ *Invalid Instagram URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}