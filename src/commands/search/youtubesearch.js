// ──────────────────────────────────────────────────
//  BIGSTACK — /youtubesearch Command
//  Search YouTube videos with Audio/Video download
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

const CACHE_TTL = 900;

// ══════════════════════════════════════════════════
//  Build card text
// ══════════════════════════════════════════════════
function buildCardText(item, index, total) {
    const lines = [`◐ Result ${index + 1} of ${total}`, ``];

    lines.push(`◈ ${item.title}`);
    lines.push(`◉ Channel   ➤  ${item.channel}`);

    if (item.duration) lines.push(`◐ Duration  ➤  ${item.duration}`);
    if (item.views)    lines.push(`▣ Views     ➤  ${item.views}`);
    if (item.published && item.published !== "-") {
        lines.push(`⊛ Published ➤  ${item.published}`);
    }

    lines.push(``);
    lines.push(`▸ Choose download format`);

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  Build keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(index, total) {
    return {
        inline_keyboard: [
            [
                { text: "◀ Prev", callback_data: `yts:p:${index}` },
                { text: "Next ▶", callback_data: `yts:n:${index}` }
            ],
            [
                { text: "♪ Download Audio (MP3)", callback_data: `yts:a:${index}` },
                { text: "▣ Download Video (MP4)", callback_data: `yts:v:${index}` }
            ],
            [
                { text: "✗ Close", callback_data: `yts:x:${index}` }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "youtubesearch",
    aliases: ["yts", "ytsearch", "ytfind"],
    category: "search",
    description: "Search YouTube videos",
    emoji: "◈",
    usage: "<video name>",

    permissions: {
        coin: 5,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const query = ctx.args.join(" ").trim();

        if (!query) {
            return ctx.reply(
                `◈ *YOUTUBESEARCH*\n\n` +
                `Search videos on YouTube.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}youtubesearch <video name>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}youtubesearch Montagem rabeta`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching YouTube...",
            command: "youtubesearch",
            input: query
        });

        try {
            logger.info(`[/youtubesearch] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.youtubesearch.search(query);

            progress.setProvider(result.provider);

            // Store per-user for callbacks
            await cache.set(`yts:u:${ctx.from.id}`, result.results, CACHE_TTL);

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} video(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            // Send first card
            const first = result.results[0];

            await ctx.replyWithPhoto(first.thumbnail, {
                caption: buildCardText(first, 0, result.count),
                parse_mode: "Markdown",
                reply_markup: buildKeyboard(0, result.count)
            });

        } catch (error) {
            logger.error(`[/youtubesearch] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No videos found\n\n` +
                    `   Try a different query.`
            });
        }
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        // ─── Next ─────────────────────────────────
        {
            pattern: /^yts:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`yts:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const next = Math.min(current + 1, results.length - 1);

                if (next === current) {
                    return ctx.answerCallbackQuery({ text: "Last result" });
                }

                await ctx.answerCallbackQuery();

                try {
                    const item = results[next];
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: item.thumbnail,
                            caption: buildCardText(item, next, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(next, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/youtubesearch next] ${e.message}`);
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^yts:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`yts:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const prev = Math.max(current - 1, 0);

                if (prev === current) {
                    return ctx.answerCallbackQuery({ text: "First result" });
                }

                await ctx.answerCallbackQuery();

                try {
                    const item = results[prev];
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: item.thumbnail,
                            caption: buildCardText(item, prev, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(prev, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/youtubesearch prev] ${e.message}`);
                }
            }
        },

        // ─── Download Audio ───────────────────────
        {
            pattern: /^yts:a:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`yts:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({ text: "♪ Downloading audio..." });

                const notification = await ctx.reply(
                    `◐ Downloading *${item.title}* (MP3)...\n\n◉ Provider ➤ resolving`,
                    { parse_mode: "Markdown" }
                );

                try {
                    // ═══════════════════════════════
                    //  Call the existing /ytmp3 downloader service
                    // ═══════════════════════════════
                    const result = await services.downloader.ytmp3.download(item.url);

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `◐ Downloading *${result.title}* (MP3)...\n\n◉ Provider ➤ ${result.provider}`,
                        { parse_mode: "Markdown" }
                    );

                    // Fetch the audio buffer
                    const axios = require("axios");
                    const { InputFile } = require("grammy");

                    const audioRes = await axios.get(result.download, {
                        responseType: "arraybuffer",
                        timeout: 60000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        }
                    });
                    const audioBuffer = Buffer.from(audioRes.data);

                    // Send the audio
                    await ctx.replyWithAudio(
                        new InputFile(
                            audioBuffer,
                            `${(result.title || "audio").replace(/[^\w\s-]/g, "").slice(0, 60)}.mp3`
                        ),
                        {
                            title: result.title,
                            performer: result.channel || "Unknown",
                            duration: result.duration || 0,
                            caption:
                                `◈ *${result.title}*\n\n` +
                                `◉ Artist    ➤  ${result.channel || "unknown"}\n` +
                                `⊛ Provider  ➤  ${result.provider}\n\n` +
                                `▸ ✓ downloaded via search`,
                            parse_mode: "Markdown"
                        }
                    );

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `✓ *Audio Downloaded*\n\n◈ ${result.title}`,
                        { parse_mode: "Markdown" }
                    );

                    logger.info(`[/youtubesearch dl-audio] sent "${result.title}" to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/youtubesearch dl-audio] failed: ${err.message}`);

                    await ctx.api
                        .editMessageText(
                            ctx.chat.id,
                            notification.message_id,
                            `✗  Audio download failed\n\n   ${err.message}`,
                            { parse_mode: "Markdown" }
                        )
                        .catch(() => {});
                }
            }
        },

        // ─── Download Video ───────────────────────
        {
            pattern: /^yts:v:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`yts:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({ text: "▣ Downloading video..." });

                const notification = await ctx.reply(
                    `◐ Downloading *${item.title}* (MP4)...\n\n◉ Provider ➤ resolving`,
                    { parse_mode: "Markdown" }
                );

                try {
                    // ═══════════════════════════════
                    //  Call the existing /ytmp4 downloader service
                    // ═══════════════════════════════
                    const result = await services.downloader.ytmp4.download(item.url);

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `◐ Downloading *${result.title}* (MP4)...\n\n◉ Provider ➤ ${result.provider}`,
                        { parse_mode: "Markdown" }
                    );

                    const axios = require("axios");
                    const { InputFile } = require("grammy");

                    const videoRes = await axios.get(result.download, {
                        responseType: "arraybuffer",
                        timeout: 180000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        }
                    });
                    const videoBuffer = Buffer.from(videoRes.data);

                    await ctx.replyWithVideo(
                        new InputFile(
                            videoBuffer,
                            `${(result.title || "video").replace(/[^\w\s-]/g, "").slice(0, 60)}.mp4`
                        ),
                        {
                            caption:
                                `◈ *${result.title}*\n\n` +
                                `◉ Author    ➤  ${result.channel || "unknown"}\n` +
                                `⊛ Provider  ➤  ${result.provider}\n\n` +
                                `▸ ✓ downloaded via search`,
                            parse_mode: "Markdown",
                            supports_streaming: true
                        }
                    );

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `✓ *Video Downloaded*\n\n◈ ${result.title}`,
                        { parse_mode: "Markdown" }
                    );

                    logger.info(`[/youtubesearch dl-video] sent "${result.title}" to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/youtubesearch dl-video] failed: ${err.message}`);

                    await ctx.api
                        .editMessageText(
                            ctx.chat.id,
                            notification.message_id,
                            `✗  Video download failed\n\n   ${err.message}`,
                            { parse_mode: "Markdown" }
                        )
                        .catch(() => {});
                }
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^yts:x:(\d+)$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Closed" });
                try {
                    await ctx.deleteMessage();
                } catch (e) {
                    // Already gone
                }
            }
        }
    ]
};