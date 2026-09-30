// ──────────────────────────────────────────────────
//  BIGSTACK — /play Command
//  Search YouTube, show card, offer download buttons
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services/downloader");
const { startProgress } = require("../../utils/progress");

// ══════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildCardCaption(result) {
    const title = result.title || "Unknown";
    const channel = result.channel || "Unknown";
    const duration = formatDuration(result.duration);
    const provider = result.provider || "unknown";

    return (
        `${title}\n\n` +
        `Artist    >  ${channel}\n` +
        `Duration  >  ${duration}\n` +
        `Provider  >  ${provider}\n\n` +
        `Choose a download option below`
    );
}

function buildCardKeyboard(messageId) {
    return {
        inline_keyboard: [
            [
                {
                    text: "Download Audio (MP3)",
                    callback_data: `play:a:${messageId}`
                }
            ],
            [
                {
                    text: "Download Video (MP4)",
                    callback_data: `play:v:${messageId}`
                }
            ],
            [
                {
                    text: "Close",
                    callback_data: `play:x:${messageId}`
                }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "play",
    aliases: ["ytplay", "music", "song"],
    category: "downloader",
    description: "Search and download audio from YouTube",
    emoji: "play",
    usage: "<song name or url>",

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
                "PLAYER\n\n" +
                "Search and download audio from YouTube.\n\n" +
                "Usage:\n" +
                `${config.prefix}play <song name>\n\n` +
                "Examples:\n" +
                `${config.prefix}play Montagem rabeta\n` +
                `${config.prefix}play Alan Walker Faded`
            );
        }

        // ─── Start progress ─────────────────────────
        const progress = await startProgress(ctx, {
            emoji: "search",
            title: "Searching YouTube...",
            command: "play",
            input: query
        });

        try {
            logger.info(`[/play] user ${ctx.from.id} searching "${query}"`);

            // ─── Call service ───────────────────────
            const result = await services.play.search(query);

            progress.setProvider(result.provider);
            progress.setTitle("Preparing card...");

            // ─── Store result for callbacks ─────────
            const cacheKey = `play:${ctx.from.id}:${ctx.message.message_id}`;

            await cache.set(
                cacheKey,
                {
                    youtubeUrl: result.videoUrl,
                    videoId: result.videoId,
                    title: result.title,
                    channel: result.channel,
                    provider: result.provider
                },
                3600
            );

            // ─── Finish progress ────────────────────
            await progress.finish({
                success: true,
                title: "Search Complete",
                extra:
                    `${result.title}\n` +
                    `${result.channel} | ${formatDuration(result.duration)}`
            });

            // ─── Send card ──────────────────────────
            const caption = buildCardCaption(result);
            const keyboard = buildCardKeyboard(ctx.message.message_id);

            if (result.thumbnail) {
                // With thumbnail
                try {
                    await ctx.replyWithPhoto(result.thumbnail, {
                        caption,
                        reply_markup: keyboard
                    });
                    logger.info(`[/play] card sent with thumbnail`);
                    return;
                } catch (err) {
                    logger.warn(`[/play] photo send failed: ${err.message}`);
                    // fall through to text-only
                }
            }

            // Without thumbnail ⏤ text fallback
            await ctx.reply(caption, { reply_markup: keyboard });
            logger.info(`[/play] card sent (text only)`);

        } catch (error) {
            logger.error(`[/play] failed for "${query}": ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra: getErrorMessage(error)
            });
        }
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        // ─── Download Audio (MP3) ─────────────────
        {
            pattern: /^play:a:(\d+)$/,
            handler: async (ctx) => {
                const messageId = ctx.match[1];
                const cacheKey = `play:${ctx.from.id}:${messageId}`;
                const data = await cache.get(cacheKey);

                if (!data?.youtubeUrl) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Try /play again.",
                        show_alert: true
                    });
                }

                await ctx.answerCallbackQuery({ text: "Downloading MP3..." });

                try {
                    const ytmp3 = require("./ytmp3");
                    const fakeCtx = Object.create(ctx);
                    fakeCtx.args = [data.youtubeUrl];
                    await ytmp3.code(fakeCtx);
                } catch (err) {
                    logger.error(`[play:a] failed: ${err.message}`);
                    await ctx.reply(`Failed to download MP3: ${err.message}`);
                }
            }
        },

        // ─── Download Video (MP4) ─────────────────
        {
            pattern: /^play:v:(\d+)$/,
            handler: async (ctx) => {
                const messageId = ctx.match[1];
                const cacheKey = `play:${ctx.from.id}:${messageId}`;
                const data = await cache.get(cacheKey);

                if (!data?.youtubeUrl) {
                    return ctx.answerCallbackQuery({
                        text: "Session expired. Try /play again.",
                        show_alert: true
                    });
                }

                await ctx.answerCallbackQuery({ text: "Downloading MP4..." });

                try {
                    const ytmp4 = require("./ytmp4");
                    const fakeCtx = Object.create(ctx);
                    fakeCtx.args = [data.youtubeUrl];
                    await ytmp4.code(fakeCtx);
                } catch (err) {
                    logger.error(`[play:v] failed: ${err.message}`);
                    await ctx.reply(`Failed to download MP4: ${err.message}`);
                }
            }
        },

        // ─── Close ────────────────────────────────
        {
            pattern: /^play:x:(\d+)$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Closed" });
                try {
                    await ctx.deleteMessage();
                } catch { /* ignore */ }
            }
        }
    ]
};

// ══════════════════════════════════════════════════
//  Errors
// ══════════════════════════════════════════════════
function getErrorMessage(error) {
    if (error.message?.includes("All play providers failed")) {
        return "No results found. Try a different search term.";
    }
    if (error.response?.status === 429) {
        return "Rate limited. Please wait a minute.";
    }
    if (error.code === "ECONNABORTED") {
        return "Download timeout. Try again.";
    }
    if (error.response?.status === 404) {
        return "Song not found. Try a different query.";
    }
    return "Something went wrong. Please try again later.";
}
