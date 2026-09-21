// ──────────────────────────────────────────────────
//  BIGSTACK — /imagesearch Command
//  Search web for images with Prev/Next cards
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

const CACHE_TTL = 900; // 15 minutes

// ══════════════════════════════════════════════════
//  Build card caption
// ══════════════════════════════════════════════════
function buildCaption(query, index, total) {
    return (
        `◐ Result ${index + 1} of ${total}\n\n` +
        `◈ ${query}\n\n` +
        `▸ Use buttons below to browse`
    );
}

// ══════════════════════════════════════════════════
//  Build keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(index, total, query) {
    const rows = [];

    // ─── Row 1 ⏤ navigation ────────────────────────
    rows.push([
        { text: "◀ Prev", callback_data: `img:p:${index}` },
        { text: "Next ▶", callback_data: `img:n:${index}` }
    ]);

    // ─── Row 2 ⏤ download ──────────────────────────
    rows.push([
        { text: "⬇ Send as file", callback_data: `img:d:${index}` }
    ]);

    // ─── Row 3 ⏤ actions ───────────────────────────
    rows.push([
        { text: "↻ Reshuffle", callback_data: `img:r:${index}` },
        { text: "✗ Close", callback_data: `img:x:${index}` }
    ]);

    return { inline_keyboard: rows };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "imagesearch",
    aliases: ["imgsearch", "ims", "img"],
    category: "search",
    description: "Search web for images",
    emoji: "◈",
    usage: "<query>",

    permissions: {
        coin: 3,
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
                `◈ *IMAGESEARCH*\n\n` +
                `Search the web for images.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}imagesearch <query>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}imagesearch Spongebob`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching images...",
            command: "imagesearch",
            input: query
        });

        try {
            logger.info(`[/imagesearch] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.imagesearch.search(query);

            progress.setProvider(result.provider);

            // ─── Store per-user for callbacks ───────
            const userKey = `img:u:${ctx.from.id}`;
            await cache.set(userKey, { urls: result.urls, query }, CACHE_TTL);

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} image(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            // ─── Send first image ───────────────────
            await ctx.replyWithPhoto(result.urls[0], {
                caption: buildCaption(query, 0, result.count),
                parse_mode: "Markdown",
                reply_markup: buildKeyboard(0, result.count, query)
            });

        } catch (error) {
            logger.error(`[/imagesearch] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No images found\n\n` +
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
            pattern: /^img:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const session = await cache.get(`img:u:${ctx.from.id}`);

                if (!session) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const next = Math.min(current + 1, session.urls.length - 1);

                if (next === current) {
                    return ctx.answerCallbackQuery({
                        text: "Last image",
                        show_alert: false
                    });
                }

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: session.urls[next],
                            caption: buildCaption(session.query, next, session.urls.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(next, session.urls.length, session.query) }
                    );
                } catch (e) {
                    logger.warn(`[/imagesearch next] edit failed: ${e.message}`);
                    await ctx.answerCallbackQuery({
                        text: "Could not load image.",
                        show_alert: true
                    }).catch(() => {});
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^img:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const session = await cache.get(`img:u:${ctx.from.id}`);

                if (!session) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const prev = Math.max(current - 1, 0);

                if (prev === current) {
                    return ctx.answerCallbackQuery({
                        text: "First image",
                        show_alert: false
                    });
                }

                await ctx.answerCallbackQuery();

                try {
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: session.urls[prev],
                            caption: buildCaption(session.query, prev, session.urls.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(prev, session.urls.length, session.query) }
                    );
                } catch (e) {
                    logger.warn(`[/imagesearch prev] edit failed: ${e.message}`);
                }
            }
        },

        // ─── Download ─────────────────────────────
        {
            pattern: /^img:d:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const session = await cache.get(`img:u:${ctx.from.id}`);

                if (!session) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const url = session.urls[index];

                await ctx.answerCallbackQuery({ text: "⬇ Sending..." });

                const axios = require("axios");
                const { InputFile } = require("grammy");

                try {
                    const res = await axios.get(url, {
                        responseType: "arraybuffer",
                        timeout: 30000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        }
                    });

                    const buffer = Buffer.from(res.data);

                    // Get extension from URL
                    const ext = url.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || "jpg";
                    const filename = `image_${Date.now()}.${ext}`;

                    await ctx.replyWithDocument(new InputFile(buffer, filename), {
                        caption:
                            `◈ *Image*\n\n` +
                            `◉ Query ➤ ${session.query}\n` +
                            `▸ ✓ sent as file`
                    });

                    logger.info(`[/imagesearch dl] sent image to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/imagesearch dl] failed: ${err.message}`);
                    await ctx.answerCallbackQuery({
                        text: "✗ Could not download",
                        show_alert: true
                    });
                }
            }
        },

        // ─── Reshuffle ────────────────────────────
        {
            pattern: /^img:r:(\d+)$/,
            handler: async (ctx) => {
                const session = await cache.get(`img:u:${ctx.from.id}`);

                if (!session) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                // Shuffle URLs
                const shuffled = [...session.urls].sort(() => Math.random() - 0.5);

                // Update cache
                await cache.set(`img:u:${ctx.from.id}`, {
                    urls: shuffled,
                    query: session.query
                }, CACHE_TTL);

                await ctx.answerCallbackQuery({ text: "↻ Reshuffled" });

                try {
                    await ctx.editMessageMedia(
                        {
                            type: "photo",
                            media: shuffled[0],
                            caption: buildCaption(session.query, 0, shuffled.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(0, shuffled.length, session.query) }
                    );
                } catch (e) {
                    logger.warn(`[/imagesearch reshuffle] edit failed: ${e.message}`);
                }
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^img:x:(\d+)$/,
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