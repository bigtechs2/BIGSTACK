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
const { startProgress } = require("../../utils/progress");

const MAX_SEND_SIZE = (config.limits?.maxSendSizeMB || 30) * 1024 * 1024;

module.exports = {
    name: "twitter",
    aliases: ["tw", "x", "twdl", "xdl"],
    category: "downloader",
    description: "Download Twitter / X videos and audio",
    emoji: "♬",
    usage: "<twitter or x url>",

    permissions: {
        coin: 5,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const url = ctx.args[0]?.trim();

        // ─── 1. Validate input ─────────────────────
        if (!url) {
            return ctx.reply(
                `♬ *TWITTER / X*\n\n` +
                `◈ Download videos and audio from Twitter / X\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}twitter <twitter url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}twitter https://x.com/user/status/123`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 2. Validate URL ───────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "twitter") {
            return ctx.reply(
                `✗  Invalid URL\n\n` +
                `   Please provide a valid Twitter / X link.`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── 3. Start live progress ────────────────
        const progress = await startProgress(ctx, {
            emoji: "♬",
            title: "Fetching from Twitter / X...",
            command: "twitter",
            input: url
        });

        try {
            await ctx.replyWithChatAction("upload_video");

            logger.info(`[/twitter] user ${ctx.from.id} requesting ${url}`);
            const result = await services.twitter.download(url);

            progress.setProvider(result.provider);
            progress.setTitle("Downloading media...");

            // ─── 4. Send videos ────────────────────
            let videoCount = 0;
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

                    const caption = buildVideoCard(result, v, i, result.videos.length);

                    await ctx.replyWithVideo(
                        new InputFile(videoBuffer, `twitter_${result.tweetId}_${i}.mp4`),
                        {
                            caption,
                            parse_mode: "Markdown",
                            supports_streaming: true,
                            thumbnail: v.thumbnail || result.thumbnail || undefined
                        }
                    );
                    videoCount++;
                }
            } else if (result.videoUrl) {
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

                const caption = buildSingleVideoCard(result);

                await ctx.replyWithVideo(
                    new InputFile(videoBuffer, `twitter_${result.tweetId}.mp4`),
                    {
                        caption,
                        parse_mode: "Markdown",
                        supports_streaming: true,
                        thumbnail: result.thumbnail || undefined
                    }
                );
                videoCount = 1;
            }

            // ─── 5. Send images if any ─────────────
            let imageCount = 0;
            for (const imageUrl of result.images) {
                try {
                    const imgRes = await axios.get(imageUrl, {
                        responseType: "arraybuffer",
                        timeout: 30000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    const imgBuffer = Buffer.from(imgRes.data);
                    await ctx.replyWithPhoto(
                        new InputFile(imgBuffer, `twitter_${result.tweetId}.jpg`),
                        {
                            caption:
                                `♬  *TWITTER IMAGE*\n\n` +
                                `◈ From @${result.author || "unknown"}\n\n` +
                                `▸ ✓ successfully downloaded`,
                            parse_mode: "Markdown"
                        }
                    );
                    imageCount++;
                } catch (e) {
                    logger.warn(`[/twitter] image download failed: ${e.message}`);
                }
            }

            // ─── 6. Send audio if available ────────
            let audioCount = 0;
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
                            caption:
                                `♬  *TWITTER AUDIO*\n\n` +
                                `◈ ${result.title ? result.title.slice(0, 100) : "Audio"}\n\n` +
                                `◉ Author    ➤  ${result.author || "unknown"}\n` +
                                `⊛ Provider  ➤  ${result.provider}\n\n` +
                                `▸ ✓ successfully downloaded`,
                            parse_mode: "Markdown"
                        }
                    );
                    audioCount++;
                } catch (e) {
                    logger.warn(`[/twitter] audio download failed: ${e.message}`);
                }
            }

            // ─── 7. Final success ──────────────────
            const parts = [];
            if (videoCount > 0) parts.push(`${videoCount} video`);
            if (imageCount > 0) parts.push(`${imageCount} image`);
            if (audioCount > 0) parts.push(`${audioCount} audio`);

            await progress.finish({
                success: true,
                title: "Media Sent",
                extra:
                    `✓  Twitter / X delivered\n\n` +
                    `   ♬ Sent       ➤ ${parts.join(" · ")}\n` +
                    `   ◉ Author     ➤ ${result.author || "unknown"}\n` +
                    `   ⊛ Provider   ➤ ${result.provider}`
            });

            logger.info(`[/twitter] ✓ sent to ${ctx.from.id}`);

        } catch (error) {
            logger.error(`[/twitter] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Download Failed",
                extra: getErrorMessage(error)
            });
        }
    }
};

// ═══════════════════════════════════════════════
//  Card builders
// ═══════════════════════════════════════════════

function buildVideoCard(result, video, index, total) {
    const title = result.title
        ? result.title.length > 100
            ? result.title.slice(0, 100) + "..."
            : result.title
        : "Twitter / X Video";

    const qualityLine = video.quality
        ? `▣ Quality   ➤  ${video.quality}\n`
        : "";

    const counterLine = total > 1
        ? `◐ Item      ➤  ${index + 1} / ${total}\n`
        : "";

    return (
        `♬  *TWITTER VIDEO*\n\n` +
        `◈ ${title}\n\n` +
        `◉ Author    ➤  ${result.author || "unknown"}\n` +
        qualityLine +
        counterLine +
        `⊛ Provider  ➤  ${result.provider}\n\n` +
        `▸ ✓ successfully downloaded`
    );
}

function buildSingleVideoCard(result) {
    const title = result.title
        ? result.title.length > 100
            ? result.title.slice(0, 100) + "..."
            : result.title
        : "Twitter / X Video";

    return (
        `♬  *TWITTER VIDEO*\n\n` +
        `◈ ${title}\n\n` +
        `◉ Author    ➤  ${result.author || "unknown"}\n` +
        `⊛ Provider  ➤  ${result.provider}\n\n` +
        `▸ ✓ successfully downloaded`
    );
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════
function getErrorMessage(error) {
    if (error.message?.includes("All twitter providers failed")) {
        return (
            `✗  Download failed\n\n` +
            `   This tweet might be private or unavailable.`
        );
    }
    if (error.message?.includes("Invalid Twitter/X URL")) {
        return `✗  Invalid Twitter / X URL`;
    }
    if (error.response?.status === 429) {
        return (
            `◐  Rate limited\n\n` +
            `   Please wait a minute before trying again.`
        );
    }
    if (error.code === "ECONNABORTED") {
        return (
            `◕  Download timeout\n\n` +
            `   Connection is too slow today.`
        );
    }
    if (error.message?.includes("request entity too large")) {
        return `✗  Media too large for Telegram`;
    }
    return (
        `✗  Something went wrong\n\n` +
        `   Please try again later.`
    );
}