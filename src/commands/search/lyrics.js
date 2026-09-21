// ──────────────────────────────────────────────────
//  BIGSTACK — /lyrics Command
//  Search song lyrics
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

// ─── Telegram message limit ─────────────────────────
const MAX_MESSAGE_LENGTH = 4000;

// ══════════════════════════════════════════════════
//  Format duration
// ══════════════════════════════════════════════════
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════
//  Truncate lyrics to fit Telegram limit
// ══════════════════════════════════════════════════
function truncateLyrics(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 20) + "\n\n... _truncated_";
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "lyrics",
    aliases: ["lyr", "lirik"],
    category: "search",
    description: "Search song lyrics",
    emoji: "◈",
    usage: "<song name>",

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
                `◈ *LYRICS*\n\n` +
                `Search lyrics for any song.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}lyrics <song name>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}lyrics Superficial love`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching lyrics...",
            command: "lyrics",
            input: query
        });

        try {
            logger.info(`[/lyrics] user ${ctx.from.id} searching "${query}"`);
            const result = await services.search.lyrics.search(query);

            progress.setProvider(result.provider);

            await progress.finish({
                success: true,
                title: "Lyrics Found",
                extra:
                    `◈ ${result.title}\n` +
                    `◉ ${result.artist}` +
                    (result.album ? `\n▣ ${result.album}` : "")
            });

            // ─── Build header ───────────────────────
            const headerLines = [
                `◈ *${result.title}*`,
                `◉ Artist    ➤  ${result.artist}`
            ];

            if (result.album) {
                headerLines.push(`▣ Album     ➤  ${result.album}`);
            }
            if (result.duration) {
                headerLines.push(`◐ Duration  ➤  ${formatDuration(result.duration)}`);
            }

            headerLines.push("");
            headerLines.push("▸ Lyrics");
            headerLines.push("");

            const header = headerLines.join("\n");
            const remaining = MAX_MESSAGE_LENGTH - header.length;

            const lyricsText = truncateLyrics(result.lyrics, remaining);

            const fullMessage = header + lyricsText;

            // ─── Send as photo + caption if thumbnail ───
            if (result.thumbnail) {
                try {
                    await ctx.replyWithPhoto(result.thumbnail, {
                        caption: fullMessage,
                        parse_mode: "Markdown"
                    });
                    return;
                } catch (e) {
                    logger.warn(`[/lyrics] photo send failed: ${e.message}`);
                    // Fall through to text
                }
            }

            // ─── Send as text ───────────────────────
            await ctx.reply(fullMessage, {
                parse_mode: "Markdown"
            });

        } catch (error) {
            logger.error(`[/lyrics] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No lyrics found\n\n` +
                    `   Try a different song or check the spelling.`
            });
        }
    }
};