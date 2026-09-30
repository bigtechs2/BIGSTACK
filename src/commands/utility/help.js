// ──────────────────────────────────────────────────
//  BIGSTACK — /help Command
//  Banner + quoted lists + tappable commands
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const path = require("path");
const fs = require("fs");
const { InputFile } = require("grammy");

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Build help text
// ══════════════════════════════════════════════════
function buildHelpText() {
    return (
        `<b>◈ BIGSTACK — ALL COMMANDS</b>\n\n` +

        `<b>◇ DOWNLOADER · 18</b>\n` +
        `<blockquote expandable>` +
        `• /play — YouTube audio\n` +
        `• /ytmp3 — YouTube → MP3\n` +
        `• /ytmp4 — YouTube → MP4\n` +
        `• /spotify — Spotify track\n` +
        `• /spotifyplay — Spotify search\n` +
        `• /applemusic — Apple Music\n` +
        `• /soundcloud — SoundCloud\n` +
        `• /instagram — Instagram posts\n` +
        `• /tiktok — TikTok videos\n` +
        `• /twitter — Twitter / X\n` +
        `• /facebook — Facebook videos\n` +
        `• /pinterest — Pinterest pins\n` +
        `• /gdrive — Google Drive\n` +
        `• /mediafire — MediaFire\n` +
        `• /terabox — Terabox\n` +
        `• /github — GitHub repos\n` +
        `• /status — Download status\n` +
        `• /cancel — Cancel download\n` +
        `</blockquote>\n\n` +

        `<b>◈ SEARCH · 9</b>\n` +
        `<blockquote expandable>` +
        `• /applesearch — Apple Music\n` +
        `• /spotifysearch — Spotify\n` +
        `• /youtubesearch — YouTube\n` +
        `• /pinterestsearch — Pinterest\n` +
        `• /imagesearch — Images\n` +
        `• /lyrics — Lyrics search\n` +
        `• /spotifylyric — Spotify lyrics\n` +
        `• /happymod — APK search\n` +
        `• /whatmusic — Identify song\n` +
        `</blockquote>\n\n` +

        `<b>★ CORE</b>\n` +
        `<blockquote expandable>` +
        `• /start — Welcome\n` +
        `• /menu — Main menu\n` +
        `• /help — This list\n` +
        `• /about — Bot info\n` +
        `</blockquote>\n\n` +

        `<b>☆ ECONOMY</b>\n` +
        `<blockquote expandable>` +
        `• /balance — Coin balance\n` +
        `• /daily — Claim daily coins\n` +
        `• /refer — Invite friends\n` +
        `• /profile — Your stats\n` +
        `• /store — Buy coins\n` +
        `• /buy — Mobile money\n` +
        `</blockquote>\n\n` +

        `<b>◉ AI</b>\n` +
        `<blockquote expandable>` +
        `• /ai — AI control center\n` +
        `• /aivoice — Voice replies toggle\n` +
        `</blockquote>\n\n` +

        `<b>⚙ SETTINGS</b>\n` +
        `<blockquote expandable>` +
        `• /settings — Preferences\n` +
        `• /lang — Change language\n` +
        `• /verify — Verify join\n` +
        `</blockquote>\n\n` +

        `<b>◈ SYSTEM</b>\n` +
        `<blockquote expandable>` +
        `• /ping — Bot latency\n` +
        `• /alive — Uptime check\n` +
        `• /runtime — System stats\n` +
        `• /report — Report a bug\n` +
        `</blockquote>\n\n` +

        `<i>▸ Tap any /command above to run it</i>\n` +
        `<i>▸ Use /menu for buttons</i>\n\n` +

        `<i>${config.footer}</i>`
    );
}

// ══════════════════════════════════════════════════
//  Resolve banner (URL or local file)
// ══════════════════════════════════════════════════
function resolveBanner() {
    const banner = config.branding?.banner || config.branding?.helpImage;
    if (!banner) return null;

    if (banner.startsWith("http://") || banner.startsWith("https://")) {
        return banner;
    }

    const abs = path.resolve(__dirname, "../../", banner);
    if (fs.existsSync(abs)) {
        return new InputFile(abs);
    }

    return null;
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "help",
    aliases: ["commands", "cmds", "h"],
    category: "utility",
    description: "Show all commands",
    emoji: "◈",
    usage: "[command name]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        logger.info(`[/help] ${ctx.from.id}`);

        const text = buildHelpText();
        const banner = resolveBanner();

        // ─── With banner ────────────────────────────
        if (banner) {
            try {
                return await ctx.replyWithPhoto(banner, {
                    caption: text,
                    parse_mode: "HTML"
                });
            } catch (err) {
                logger.warn(`[/help] banner failed: ${err.message}`);
            }
        }

        // ─── Text only ──────────────────────────────
        await ctx.reply(text, { parse_mode: "HTML" });
    }
};