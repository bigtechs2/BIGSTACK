// ──────────────────────────────────────────────────
//  BIGSTACK — /applesearch Command
//  Search Apple Music with Prev/Next/Download cards
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { InputFile } = require("grammy");
const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

const CACHE_TTL = 900; // 15 minutes

// ══════════════════════════════════════════════════
//  Build the card text
// ══════════════════════════════════════════════════
function buildCardText(result, index, total) {
    const item = result[index];
    const explicit = item.explicit ? " · explicit" : "";

    return (
        `◐ Result ${index + 1} of ${total}\n\n` +
        `◈ ${item.title}\n` +
        `◉ ${item.subtitle}${explicit}\n\n` +
        `▸ Tap a button below`
    );
}

// ══════════════════════════════════════════════════
//  Build the inline keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(index, total) {
    const rows = [];

    // Row 1 ⏤ prev / next
    const navRow = [];
    navRow.push({
        text: "◀ Prev",
        callback_data: `am:p:${index}`,
        style: index === 0 ? "danger" : undefined
    });
    navRow.push({
        text: "Next ▶",
        callback_data: `am:n:${index}`,
        style: index === total - 1 ? "danger" : undefined
    });
    rows.push(navRow);

    // Row 2 ⏤ download
    rows.push([
        {
            text: "⬇ Download",
            callback_data: `am:d:${index}`
        }
    ]);

    // Row 3 ⏤ cancel
    rows.push([
        {
            text: "✗ Close",
            callback_data: `am:x:${index}`
        }
    ]);

    return { inline_keyboard: rows };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "applesearch",
    aliases: ["amsearch", "aps", "apples"],
    category: "search",
    description: "Search Apple Music tracks",
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

        if (!query) {
            return ctx.reply(
                `◈ *APPLESEARCH*\n\n` +
                `Search Apple Music catalog.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}applesearch <song name>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}applesearch Montagem rabeta`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching Apple Music...",
            command: "applesearch",
            input: query
        });

        try {
            logger.info(`[/applesearch] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.applesearch.search(query);

            progress.setProvider(result.provider);

            // Store results per user for callbacks
            const userKey = `am:u:${ctx.from.id}`;
            await cache.set(userKey, result.results, CACHE_TTL);

            // Send first card
            const first = result.results[0];

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} result(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            await ctx.replyWithPhoto(first.image, {
                caption: buildCardText(result.results, 0, result.count),
                parse_mode: "Markdown",
                reply_markup: buildKeyboard(0, result.count)
            });

        } catch (error) {
            logger.error(`[/applesearch] failed: ${error.message}`);

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
    //  Callback handlers
    // ══════════════════════════════════════════════
    callbacks: [
        // ─── Next ─────────────────────────────────
        {
            pattern: /^am:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`am:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const next = Math.min(current + 1, results.length - 1);

                if (next === current) {
                    return ctx.answerCallbackQuery({
                        text: "Last result",
                        show_alert: false
                    });
                }

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: results[next].image,
                            caption: buildCardText(results, next, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(next, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/applesearch next] edit failed: ${e.message}`);
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^am:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`am:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const prev = Math.max(current - 1, 0);

                if (prev === current) {
                    return ctx.answerCallbackQuery({
                        text: "First result",
                        show_alert: false
                    });
                }

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: results[prev].image,
                            caption: buildCardText(results, prev, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(prev, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/applesearch prev] edit failed: ${e.message}`);
                }
            }
        },

        // ─── Download ─────────────────────────────
        {
            pattern: /^am:d:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`am:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({
                    text: "⬇ Downloading..."
                });

                // Notify user
                const notification = await ctx.reply(
                    `◐ Downloading *${item.title}*...\n\n◉ Provider ➤ ${item.url ? "resolving" : "unknown"}`,
                    { parse_mode: "Markdown" }
                );

                try {
                    // ═══════════════════════════════
                    //  Call the Apple Music downloader
                    // ═══════════════════════════════
                    const result = await services.downloader.applemusic.download(item.url);

                    // Update notification
                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `◐ Downloading *${result.title}*...\n\n◉ Provider ➤ ${result.provider}`,
                        { parse_mode: "Markdown" }
                    );

                    // Fetch the audio buffer
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

                    // Update notification
                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `✓ *Downloaded*\n\n◈ ${result.title}\n◉ ${result.channel || "unknown"}`,
                        { parse_mode: "Markdown" }
                    );

                    logger.info(`[/applesearch dl] sent "${result.title}" to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/applesearch dl] failed: ${err.message}`);

                    await ctx.api.editMessageText(
                        ctx.chat.id,
                        notification.message_id,
                        `✗  Download failed\n\n   ${err.message}`,
                        { parse_mode: "Markdown" }
                    ).catch(() => {});
                }
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^am:x:(\d+)$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Closed" });

                try {
                    await ctx.deleteMessage();
                } catch (e) {
                    // Message may already be gone
                }
            }
        }
    ]
};