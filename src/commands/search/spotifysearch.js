// ──────────────────────────────────────────────────
//  BIGSTACK — /spotifysearch Command
//  Search Spotify tracks with Prev/Next/Download
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

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
    const lines = [
        `◐ Result ${index + 1} of ${total}`,
        ``,
        `◈ ${item.title}`,
        `◉ Artist    ➤  ${item.artist}`
    ];

    if (item.album) {
        lines.push(`▣ Album     ➤  ${item.album}`);
    }
    if (item.duration) {
        lines.push(`◐ Duration  ➤  ${item.duration}`);
    }

    lines.push(``);
    lines.push(`▸ Tap a button below`);

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  Build keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(index, total) {
    return {
        inline_keyboard: [
            [
                { text: "◀ Prev", callback_data: `ss:p:${index}` },
                { text: "Next ▶", callback_data: `ss:n:${index}` }
            ],
            [
                { text: "⬇ Download", callback_data: `ss:d:${index}` }
            ],
            [
                { text: "✗ Close", callback_data: `ss:x:${index}` }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "spotifysearch",
    aliases: ["sps", "spsearch", "splay"],
    category: "search",
    description: "Search Spotify tracks",
    emoji: "◈",
    usage: "<song name>",

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

        // ─── Validate input ─────────────────────────
        if (!query) {
            return ctx.reply(
                `◈ *SPOTIFYSEARCH*\n\n` +
                `◈ Search the Spotify catalog\n\n` +
                `▸ Usage\n` +
                `   ➤ \`${config.prefix}spotifysearch <song name>\`\n\n` +
                `▸ Example\n` +
                `   ➤ \`${config.prefix}spotifysearch Montagem rabeta\``,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Start progress ─────────────────────────
        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching Spotify...",
            command: "spotifysearch",
            input: query
        });

        try {
            logger.info(`[/spotifysearch] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.spotifysearch.search(query);

            progress.setProvider(result.provider);

            // ─── Store results per user ─────────────
            await cache.set(`ss:u:${ctx.from.id}`, result.results, CACHE_TTL);

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} result(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            // ─── Send first card ────────────────────
            const first = result.results[0];
            const caption = buildCardText(first, 0, result.count);
            const keyboard = buildKeyboard(0, result.count);

            if (first.cover) {
                await ctx.replyWithPhoto(first.cover, {
                    caption,
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            } else {
                await ctx.reply(caption, {
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            }

        } catch (error) {
            logger.error(`[/spotifysearch] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No results found\n\n` +
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
            pattern: /^ss:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`ss:u:${ctx.from.id}`);

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
                    const text = buildCardText(item, next, results.length);

                    if (item.cover) {
                        await ctx.editMessageMedia(
                            {
                                type: "photo",
                                media: item.cover,
                                caption: text,
                                parse_mode: "Markdown"
                            },
                            { reply_markup: buildKeyboard(next, results.length) }
                        );
                    } else {
                        await ctx.editMessageText(text, {
                            parse_mode: "Markdown",
                            reply_markup: buildKeyboard(next, results.length)
                        });
                    }
                } catch (e) {
                    logger.warn(`[/spotifysearch next] ${e.message}`);
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^ss:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`ss:u:${ctx.from.id}`);

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
                    const text = buildCardText(item, prev, results.length);

                    if (item.cover) {
                        await ctx.editMessageMedia(
                            {
                                type: "photo",
                                media: item.cover,
                                caption: text,
                                parse_mode: "Markdown"
                            },
                            { reply_markup: buildKeyboard(prev, results.length) }
                        );
                    } else {
                        await ctx.editMessageText(text, {
                            parse_mode: "Markdown",
                            reply_markup: buildKeyboard(prev, results.length)
                        });
                    }
                } catch (e) {
                    logger.warn(`[/spotifysearch prev] ${e.message}`);
                }
            }
        },

        // ─── Download ─────────────────────────────
        {
            pattern: /^ss:d:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`ss:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({ text: "⬇ Downloading..." });

                const notification = await ctx.reply(
                    `◐ Downloading *${item.title}*...\n\n◉ Provider ➤ resolving`,
                    { parse_mode: "Markdown" }
                );

                try {
                    const result = await services.downloader.spotify.download(item.url);

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `◐ Downloading *${result.title}*...\n\n◉ Provider ➤ ${result.provider}`,
                        { parse_mode: "Markdown" }
                    );

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

                    await ctx.replyWithAudio(
                        new InputFile(
                            audioBuffer,
                            `${(result.title || "audio").replace(/[^\w\s-]/g, "").slice(0, 60)}.mp3`
                        ),
                        {
                            title: result.title,
                            performer: result.channel,
                            duration: result.duration || 0,
                            caption:
                                `◈ *${result.title}*\n\n` +
                                (result.channel ? `◉ Artist    ➤  ${result.channel}\n` : "") +
                                `⊛ Provider  ➤  ${result.provider}\n\n` +
                                `▸ ✓ downloaded via search`,
                            parse_mode: "Markdown"
                        }
                    );

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `✓ *Downloaded*\n\n◈ ${result.title}\n◉ ${result.channel || "unknown"}`,
                        { parse_mode: "Markdown" }
                    );

                    logger.info(`[/spotifysearch dl] sent "${result.title}" to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/spotifysearch dl] failed: ${err.message}`);

                    await ctx.api
                        .editMessageText(
                            ctx.chat.id,
                            notification.message_id,
                            `✗  Download failed\n\n   ${err.message}`,
                            { parse_mode: "Markdown" }
                        )
                        .catch(() => {});
                }
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^ss:x:(\d+)$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Closed" });
                try {
                    await ctx.deleteMessage();
                } catch {}
            }
        }
    ]
};