// ──────────────────────────────────────────────────
//  BIGSTACK — /twitter Command
//  Download Twitter / X videos + audio
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services/downloader");

module.exports = {
    // ─── Metadata ───────────────────────────────────
    name: "twitter",
    aliases: ["tw", "x", "twdl", "xdl"],
    category: "downloader",
    description: "Download Twitter / X videos and audio",
    emoji: "🐦",
    usage: "<twitter or x url>",

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
                `🐦 *TWITTER / X*\n\n` +
                    `Download videos and audio from Twitter / X.\n\n` +
                    `*Usage:*\n` +
                    `${config.prefix}twitter <twitter url>\n\n` +
                    `*Example:*\n` +
                    `${config.prefix}twitter https://x.com/coolpan967/status/2016539130352832648`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ────────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "twitter") {
            return ctx.reply("❌ Please provide a valid *Twitter / X* URL.", {
                parse_mode: "Markdown"
            });
        }

        // ─── 3. Send loading ────────────────────────
        const loading = await ctx.reply(
            `⏳ *Processing...*\n\nFetching from Twitter / X...`,
            { parse_mode: "Markdown" }
        );

        try {
            // ─── 4. Chat action ─────────────────────
            await ctx.replyWithChatAction("upload_video");

            // ─── 5. Call service ────────────────────
            logger.info(`[/twitter] user ${ctx.from.id} requesting ${url}`);
            const result = await services.twitter.download(url);

            // ─── 6. Update loading ──────────────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `🐦 *Twitter / X*\n\n` +
                    `👤 *Author:* ${result.author}\n` +
                    (result.videoQuality ? `🎞 *Quality:* ${result.videoQuality}\n` : "") +
                    `📡 *Provider:* ${result.provider}\n\n` +
                    `📥 Downloading...`,
                { parse_mode: "Markdown" }
            );

            // ─── 7. Download & send all videos ──────
            if (result.videos.length > 0) {
                for (let i = 0; i < result.videos.length; i++) {
                    const v = result.videos[i];
                    if (!v.url) continue;

                    logger.info(`[/twitter] downloading video ${i + 1}/${result.videos.length}...`);

                    const videoRes = await axios.get(v.url, {
                        responseType: "arraybuffer",
                        timeout: 120000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Referer": "https://twitter.com/"
                        }
                    });
                    const videoBuffer = Buffer.from(videoRes.data);

                    const caption =
                        `🐦 *Twitter / X*\n\n` +
                        (result.title ? `${result.title}\n\n` : "") +
                        `👤 *Author:* ${result.author}\n` +
                        (v.quality ? `🎞 *Quality:* ${v.quality}\n` : "") +
                        `📡 *Provider:* ${result.provider}`;

                    await ctx.replyWithVideo(
                        new InputFile(videoBuffer, `twitter_${result.tweetId}_${i}.mp4`),
                        {
                            caption,
                            parse_mode: "Markdown",
                            supports_streaming: true,
                            thumbnail: v.thumbnail || result.thumbnail || undefined
                        }
                    );
                }
            } else if (result.videoUrl) {
                // Single video fallback
                const videoRes = await axios.get(result.videoUrl, {
                    responseType: "arraybuffer",
                    timeout: 120000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    headers: {
                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": "https://twitter.com/"
                    }
                });
                const videoBuffer = Buffer.from(videoRes.data);

                const caption =
                    `🐦 *Twitter / X*\n\n` +
                    (result.title ? `${result.title}\n\n` : "") +
                    `👤 *Author:* ${result.author}\n` +
                    `📡 *Provider:* ${result.provider}`;

                await ctx.replyWithVideo(
                    new InputFile(videoBuffer, `twitter_${result.tweetId}.mp4`),
                    {
                        caption,
                        parse_mode: "Markdown",
                        supports_streaming: true,
                        thumbnail: result.thumbnail || undefined
                    }
                );
            }

            // ─── 8. Send images if any ──────────────
            for (const imageUrl of result.images) {
                try {
                    const imgRes = await axios.get(imageUrl, {
                        responseType: "arraybuffer",
                        timeout: 30000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    const imgBuffer = Buffer.from(imgRes.data);
                    await ctx.replyWithPhoto(new InputFile(imgBuffer, `twitter_${result.tweetId}.jpg`), {
                        caption: `🖼 *Twitter / X Image*`,
                        parse_mode: "Markdown"
                    });
                } catch (e) {
                    logger.warn(`[/twitter] image download failed: ${e.message}`);
                }
            }

            // ─── 9. Send audio if available ─────────
            if (result.audio) {
                try {
                    logger.info(`[/twitter] downloading audio...`);
                    const audioRes = await axios.get(result.audio, {
                        responseType: "arraybuffer",
                        timeout: 60000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    const audioBuffer = Buffer.from(audioRes.data);

                    await ctx.replyWithAudio(
                        new InputFile(audioBuffer, `twitter_${result.tweetId}.mp3`),
                        {
                            title: result.title || "Twitter Audio",
                            performer: result.author || "Unknown",
                            caption: `🎧 *Twitter / X Audio*\n\n📡 *Provider:* ${result.provider}`,
                            parse_mode: "Markdown"
                        }
                    );
                } catch (e) {
                    logger.warn(`[/twitter] audio download failed: ${e.message}`);
                }
            }

            // ─── 10. Clean up ───────────────────────
            await ctx.api
                .deleteMessage(ctx.chat.id, loading.message_id)
                .catch(() => {});

            logger.info(`[/twitter] ✅ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/twitter] failed: ${error.message}`);

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

// ─── Helpers ────────────────────────────────────────
function getErrorMessage(error) {
    if (error.message?.includes("All twitter providers failed")) {
        return "❌ *Download failed.*\n\nThis tweet might be private or unavailable.";
    }
    if (error.message?.includes("Invalid Twitter/X URL")) {
        return "❌ *Invalid Twitter / X URL.*";
    }
    if (error.response?.status === 429) {
        return "⏳ *Rate limited.*\n\nPlease wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "⌛ *Download timeout.*\n\nTry again in a moment.";
    }
    return "❌ *Something went wrong.*\n\nPlease try again later.";
}