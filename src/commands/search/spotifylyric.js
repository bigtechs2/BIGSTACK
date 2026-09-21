// ──────────────────────────────────────────────────
//  BIGSTACK — /spotifylyric Command
//  Search lyrics by Spotify track URL
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const services = require("../../services");
const { startProgress } = require("../../utils/progress");

// ─── Telegram limits ────────────────────────────────
const MAX_MESSAGE_LENGTH = 3800;
const MAX_CAPTION_LENGTH = 1000;

// ══════════════════════════════════════════════════
//  Format duration from milliseconds
// ══════════════════════════════════════════════════
function formatDuration(ms) {
    if (!ms || ms <= 0) return null;
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════
//  Escape backticks inside lyrics
// ══════════════════════════════════════════════════
function escapeBackticks(text) {
    if (!text) return "";
    return text.replace(/`/g, "'");
}

// ══════════════════════════════════════════════════
//  Truncate lyrics to fit limit
// ══════════════════════════════════════════════════
function truncateLyrics(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 25) + "\n\n... (truncated)";
}

// ══════════════════════════════════════════════════
//  Build header
// ══════════════════════════════════════════════════
function buildHeader(result) {
    const lines = [
        `◈ *${result.title}*`,
        `◉ Artist    ➤  ${result.artist}`
    ];

    if (result.album) {
        lines.push(`▣ Album     ➤  ${result.album}`);
    }
    if (result.durationMs) {
        lines.push(`◐ Duration  ➤  ${formatDuration(result.durationMs)}`);
    }

    lines.push("");
    lines.push("▸ Lyrics");
    lines.push("");

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  Build code block
// ══════════════════════════════════════════════════
function buildCodeBlock(lyricsText) {
    return "```\n" + lyricsText + "\n```";
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "spotifylyric",
    aliases: ["splyrics", "spl"],
    category: "search",
    description: "Search lyrics by Spotify track URL",
    emoji: "◈",
    usage: "<spotify url>",

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

        if (!url) {
            return ctx.reply(
                `◈ *SPOTIFYLYRIC*\n\n` +
                `Search lyrics by Spotify track URL.\n\n` +
                `▸ Usage\n` +
                `   ➤ ${config.prefix}spotifylyric <spotify url>\n\n` +
                `▸ Example\n` +
                `   ➤ ${config.prefix}spotifylyric https://open.spotify.com/track/xxx`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Validate Spotify URL ────────────────────
        if (!config.siteMap.isSupported(url) || config.siteMap.getPlatform(url) !== "spotify") {
            return ctx.reply(
                `✗  Invalid URL\n\n` +
                `   Please provide a valid Spotify track URL.`,
                { parse_mode: "Markdown" }
            );
        }

        const progress = await startProgress(ctx, {
            emoji: "◐",
            title: "Searching lyrics...",
            command: "spotifylyric",
            input: url
        });

        try {
            logger.info(`[/spotifylyric] user ${ctx.from.id} requesting ${url}`);
            const result = await services.search.spotifylyric.search(url);

            progress.setProvider(result.provider);

            await progress.finish({
                success: true,
                title: "Lyrics Found",
                extra:
                    `◈ ${result.title}\n` +
                    `◉ ${result.artist}` +
                    (result.album ? `\n▣ ${result.album}` : "")
            });

            // ─── Prepare lyrics text ────────────────
            const safeLyrics = escapeBackticks(result.lyrics);
            const header = buildHeader(result);

            // ─── Try photo + caption first ──────────
            if (result.cover) {
                const remaining = MAX_CAPTION_LENGTH - header.length - 10;

                if (remaining > 100) {
                    const lyricsText = truncateLyrics(safeLyrics, remaining);
                    const caption = header + buildCodeBlock(lyricsText);

                    try {
                        await ctx.replyWithPhoto(result.cover, {
                            caption,
                            parse_mode: "Markdown"
                        });
                        return;
                    } catch (e) {
                        logger.warn(`[/spotifylyric] photo send failed: ${e.message}`);
                    }
                }
            }

            // ─── Send as text ───────────────────────
            const remaining = MAX_MESSAGE_LENGTH - header.length - 10;
            const lyricsText = truncateLyrics(safeLyrics, remaining);
            const fullMessage = header + buildCodeBlock(lyricsText);

            await ctx.reply(fullMessage, {
                parse_mode: "Markdown"
            });

        } catch (error) {
            logger.error(`[/spotifylyric] failed: ${error.message}`);

            await progress.finish({
                success: false,
                title: "Search Failed",
                extra:
                    `✗  No lyrics found\n\n` +
                    `   This track might not have lyrics available.`
            });
        }
    }
};