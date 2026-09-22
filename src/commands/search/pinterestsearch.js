// ──────────────────────────────────────────────────
//  BIGSTACK — /pinterestsearch Command
//  Search Pinterest pins with Prev/Next/Send
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
    const lines = [`◐ Result ${index + 1} of ${total}`, ``];

    if (item.title) {
        lines.push(`◈ ${item.title}`);
    } else {
        lines.push(`◈ Untitled Pin`);
    }

    lines.push(`◉ By        ➤  ${item.fullName || item.username}`);

    if (item.username && item.username !== "unknown") {
        lines.push(`⊛ Username  ➤  @${item.username}`);
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
                { text: "◀ Prev", callback_data: `pin:p:${index}` },
                { text: "Next ▶", callback_data: `pin:n:${index}` }
            ],
            [
                { text: "⬇ Send as file", callback_data: `pin:d:${index}` }
            ],
            [
                { text: "↗ Open on Pinterest", callback_data: `pin:o:${index}` },
                { text: "✗ Close", callback_data: `pin:x:${index}` }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "pinterestsearch",
    aliases: ["pins", "pinsearch", "psearch"],
    category: "search",
    description: "Search Pinterest pins",
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
                `◈ *PINTERESTSEARCH*\n\n` +
                `Search images on Pinterest.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}pinterestsearch <query>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}pinterestsearch Range Rover`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching Pinterest...",
            command: "pinterestsearch",
            input: query
        });

        try {
            logger.info(`[/pinterestsearch] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.pinterestsearch.search(query);

            progress.setProvider(result.provider);

            // Store per-user for callbacks
            await cache.set(`pin:u:${ctx.from.id}`, result.results, CACHE_TTL);

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} pin(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            // Send first card
            const first = result.results[0];

            await ctx.replyWithPhoto(first.image, {
                caption: buildCardText(first, 0, result.count),
                parse_mode: "Markdown",
                reply_markup: buildKeyboard(0, result.count)
            });

        } catch (error) {
            logger.error(`[/pinterestsearch] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No pins found\n\n` +
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
            pattern: /^pin:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`pin:u:${ctx.from.id}`);

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
                            media: item.image,
                            caption: buildCardText(item, next, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(next, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/pinterestsearch next] ${e.message}`);
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^pin:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`pin:u:${ctx.from.id}`);

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
                            media: item.image,
                            caption: buildCardText(item, prev, results.length),
                            parse_mode: "Markdown"
                        },
                        { reply_markup: buildKeyboard(prev, results.length) }
                    );
                } catch (e) {
                    logger.warn(`[/pinterestsearch prev] ${e.message}`);
                }
            }
        },

        // ─── Download ─────────────────────────────
        {
            pattern: /^pin:d:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`pin:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({ text: "⬇ Sending..." });

                try {
                    const res = await axios.get(item.image, {
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
                    const ext = item.image.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || "jpg";
                    const filename = `pin_${item.id || Date.now()}.${ext}`;

                    await ctx.replyWithDocument(new InputFile(buffer, filename), {
                        caption:
                            `◈ *${item.title || "Pinterest Pin"}*\n\n` +
                            (item.fullName ? `◉ By        ➤  ${item.fullName}\n` : "") +
                            (item.username !== "unknown" ? `⊛ Username  ➤  @${item.username}\n` : "") +
                            `\n▸ ✓ sent as file`
                    });

                    logger.info(`[/pinterestsearch dl] sent pin to ${ctx.from.id}`);

                } catch (err) {
                    logger.error(`[/pinterestsearch dl] failed: ${err.message}`);
                    await ctx.answerCallbackQuery({
                        text: "✗ Could not download",
                        show_alert: true
                    }).catch(() => {});
                }
            }
        },

        // ─── Open on Pinterest ────────────────────
        {
            pattern: /^pin:o:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`pin:u:${ctx.from.id}`);

                if (!results || !results[index]?.pinUrl) {
                    return ctx.answerCallbackQuery({
                        text: "No link available",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery();

                await ctx.reply(
                    `◈ *${item.title || "Pinterest Pin"}*\n\n` +
                    `▸ Open original pin:\n${item.pinUrl}`,
                    {
                        parse_mode: "Markdown",
                        disable_web_page_preview: false
                    }
                );
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^pin:x:(\d+)$/,
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