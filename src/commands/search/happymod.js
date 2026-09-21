// ──────────────────────────────────────────────────
//  BIGSTACK — /happymod Command
//  Search HappyMod for APKs
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

const CACHE_TTL = 900;

// ══════════════════════════════════════════════════
//  Build card caption — shows fields only if present
// ══════════════════════════════════════════════════
function buildCaption(item, index, total) {
    const lines = [
        `◐ Result ${index + 1} of ${total}`,
        ``,
        `◈ ${item.title}`
    ];

    if (item.version)    lines.push(`◉ Version   ➤  ${item.version}`);
    if (item.size)       lines.push(`▣ Size      ➤  ${item.size}`);
    if (item.modStatus)  lines.push(`★ Mod       ➤  ${item.modStatus}`);
    if (item.package)    lines.push(`⊛ Package   ➤  ${item.package}`);

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
                { text: "◀ Prev", callback_data: `hm:p:${index}` },
                { text: "Next ▶", callback_data: `hm:n:${index}` }
            ],
            [
                { text: "⬇ Get APK Link", callback_data: `hm:d:${index}` }
            ],
            [
                { text: "✗ Close", callback_data: `hm:x:${index}` }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "happymod",
    aliases: ["apk", "apks", "modapk", "apksearch"],
    category: "search",
    description: "Search HappyMod for APKs",
    emoji: "◈",
    usage: "<app name>",

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
                `◈ *HAPPYMOD*\n\n` +
                `Search for APKs on HappyMod.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}happymod <app name>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}happymod WhatsApp`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching HappyMod...",
            command: "happymod",
            input: query
        });

        try {
            logger.info(`[/happymod] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.happymod.search(query);

            progress.setProvider(result.provider);

            // Store per-user for callbacks
            await cache.set(`hm:u:${ctx.from.id}`, result.results, CACHE_TTL);

            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `◈ Found ${result.count} APK(s)\n` +
                    `◉ Provider ➤ ${result.provider}\n\n` +
                    `▸ Use buttons below to browse`
            });

            // Send first card
            const first = result.results[0];
            const caption = buildCaption(first, 0, result.count);
            const keyboard = buildKeyboard(0, result.count);

            if (first.icon) {
                await ctx.replyWithPhoto(first.icon, {
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
            logger.error(`[/happymod] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No APKs found\n\n` +
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
            pattern: /^hm:n:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`hm:u:${ctx.from.id}`);

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
                    const text = buildCaption(item, next, results.length);

                    if (item.icon) {
                        await ctx.editMessageMedia(
                            {
                                type: "photo",
                                media: item.icon,
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
                    logger.warn(`[/happymod next] ${e.message}`);
                }
            }
        },

        // ─── Prev ─────────────────────────────────
        {
            pattern: /^hm:p:(\d+)$/,
            handler: async (ctx) => {
                const current = parseInt(ctx.match[1]);
                const results = await cache.get(`hm:u:${ctx.from.id}`);

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
                    const text = buildCaption(item, prev, results.length);

                    if (item.icon) {
                        await ctx.editMessageMedia(
                            {
                                type: "photo",
                                media: item.icon,
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
                    logger.warn(`[/happymod prev] ${e.message}`);
                }
            }
        },

        // ─── Get APK Link ─────────────────────────
        {
            pattern: /^hm:d:(\d+)$/,
            handler: async (ctx) => {
                const index = parseInt(ctx.match[1]);
                const results = await cache.get(`hm:u:${ctx.from.id}`);

                if (!results) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Search again.",
                        show_alert: true
                    });
                }

                const item = results[index];

                await ctx.answerCallbackQuery({ text: "Opening..." });

                const lines = [
                    `◈ *${item.title}*`,
                    ``
                ];

                if (item.version)    lines.push(`◉ Version   ➤  ${item.version}`);
                if (item.size)       lines.push(`▣ Size      ➤  ${item.size}`);
                if (item.modStatus)  lines.push(`★ Mod       ➤  ${item.modStatus}`);
                if (item.package)    lines.push(`⊛ Package   ➤  ${item.package}`);

                lines.push(``);
                lines.push(`▸ APK Download`);
                lines.push(`[⬇ Open on HappyMod](${item.url})`);
                lines.push(``);
                lines.push(`_Tap the link to download the APK from your browser._`);

                await ctx.reply(lines.join("\n"), {
                    parse_mode: "Markdown",
                    disable_web_page_preview: false
                });

                logger.info(`[/happymod dl] sent link to ${ctx.from.id}`);
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^hm:x:(\d+)$/,
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