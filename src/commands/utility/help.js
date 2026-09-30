// ──────────────────────────────────────────────────
//  BIGSTACK — /help Command
//  Full command list in quote + list style
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Build help text ⏤ quote + list
// ══════════════════════════════════════════════════
function buildHelpText() {
    return (
        `<b>◈ BIGSTACK — ALL COMMANDS</b>\n` +
        `<blockquote>` +
        `<b>◇ DOWNLOADER · 18</b>\n` +
        `• <code>/play</code> — YouTube audio\n` +
        `• <code>/ytmp3</code> — YouTube → MP3\n` +
        `• <code>/ytmp4</code> — YouTube → MP4\n` +
        `• <code>/spotify</code> — Spotify track\n` +
        `• <code>/spotifyplay</code> — Spotify search\n` +
        `• <code>/applemusic</code> — Apple Music\n` +
        `• <code>/soundcloud</code> — SoundCloud\n` +
        `• <code>/instagram</code> — Instagram posts\n` +
        `• <code>/tiktok</code> — TikTok videos\n` +
        `• <code>/twitter</code> — Twitter / X\n` +
        `• <code>/facebook</code> — Facebook videos\n` +
        `• <code>/pinterest</code> — Pinterest pins\n` +
        `• <code>/gdrive</code> — Google Drive\n` +
        `• <code>/mediafire</code> — MediaFire\n` +
        `• <code>/terabox</code> — Terabox\n` +
        `• <code>/github</code> — GitHub repos\n` +
        `• <code>/status</code> — Download status\n` +
        `• <code>/cancel</code> — Cancel download\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>◈ SEARCH · 9</b>\n` +
        `• <code>/applesearch</code> — Apple Music\n` +
        `• <code>/spotifysearch</code> — Spotify\n` +
        `• <code>/youtubesearch</code> — YouTube\n` +
        `• <code>/pinterestsearch</code> — Pinterest\n` +
        `• <code>/imagesearch</code> — Images\n` +
        `• <code>/lyrics</code> — Lyrics search\n` +
        `• <code>/spotifylyric</code> — Spotify lyrics\n` +
        `• <code>/happymod</code> — APK search\n` +
        `• <code>/whatmusic</code> — Identify song\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>★ CORE</b>\n` +
        `• <code>/start</code> — Welcome\n` +
        `• <code>/menu</code> — Main menu\n` +
        `• <code>/help</code> — This list\n` +
        `• <code>/about</code> — Bot info\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>☆ ECONOMY</b>\n` +
        `• <code>/balance</code> — Coin balance\n` +
        `• <code>/daily</code> — Claim daily coins\n` +
        `• <code>/refer</code> — Invite friends\n` +
        `• <code>/profile</code> — Your stats\n` +
        `• <code>/store</code> — Buy coins\n` +
        `• <code>/buy</code> — Mobile money\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>◉ AI</b>\n` +
        `• <code>/ai</code> — AI control center\n` +
        `• <code>/aivoice</code> — Voice replies toggle\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>⚙ SETTINGS</b>\n` +
        `• <code>/settings</code> — Preferences\n` +
        `• <code>/lang</code> — Change language\n` +
        `• <code>/verify</code> — Verify join\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>◈ SYSTEM</b>\n` +
        `• <code>/ping</code> — Bot latency\n` +
        `• <code>/alive</code> — Uptime check\n` +
        `• <code>/runtime</code> — System stats\n` +
        `• <code>/report</code> — Report a bug\n` +
        `</blockquote>\n\n` +

        `<blockquote>` +
        `<b>🛡 ADMIN</b>\n` +
        `• <code>/stats</code> — Bot statistics\n` +
        `• <code>/broadcast</code> — Message all\n` +
        `• <code>/pending</code> — Pending payments\n` +
        `• <code>/approve</code> — Approve payment\n` +
        `• <code>/reject</code> — Reject payment\n` +
        `• <code>/ban</code> — Ban user\n` +
        `• <code>/unban</code> — Unban user\n` +
        `</blockquote>\n\n` +

        `<b>▸ Tips</b>\n` +
        `• Use <code>/menu</code> for buttons\n` +
        `• Use <code>/help &lt;command&gt;</code> for details\n` +
        `• Use <code>/report</code> to send bug reports\n\n` +

        `<i>${config.footer}</i>`
    );
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
        const helpImage =
            config.branding?.helpImage || config.branding?.banner;

        // ─── Try banner ─────────────────────────────
        if (helpImage && helpImage.startsWith("http")) {
            try {
                return await ctx.replyWithPhoto(helpImage, {
                    caption: text,
                    parse_mode: "HTML"
                });
            } catch (err) {
                logger.warn(`[/help] image failed: ${err.message}`);
            }
        }

        // ─── Fallback: text only ────────────────────
        await ctx.reply(text, { parse_mode: "HTML" });
    }
};