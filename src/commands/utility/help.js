// ──────────────────────────────────────────────────
//  BIGSTACK — /help Command
//  Full command list wrapped in code block
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  Build help text ⏤ ALL inside one code block
// ══════════════════════════════════════════════════
function buildHelpText() {
    const body =
        `◈ BIGSTACK — ALL COMMANDS\n` +
        `─────────────────────────────\n\n` +

        `◇ DOWNLOADER (18)\n` +
        `   /play · /ytmp3 · /ytmp4 · /spotify\n` +
        `   /spotifyplay · /applemusic · /soundcloud\n` +
        `   /instagram · /tiktok · /twitter · /facebook\n` +
        `   /pinterest · /gdrive · /mediafire\n` +
        `   /terabox · /github · /status · /cancel\n\n` +

        `◈ SEARCH (9)\n` +
        `   /applesearch · /spotifysearch · /youtubesearch\n` +
        `   /pinterestsearch · /imagesearch · /lyrics\n` +
        `   /spotifylyric · /happymod · /whatmusic\n\n` +

        `★ UTILITY (30)\n` +
        `   Core:\n` +
        `     /start · /menu · /help · /about\n` +
        `   Economy:\n` +
        `     /balance · /daily · /refer · /profile\n` +
        `     /store · /buy\n` +
        `   Settings:\n` +
        `     /settings · /verify · /lang\n` +
        `   AI:\n` +
        `     /ai · /aivoice\n` +
        `   System:\n` +
        `     /ping · /alive · /runtime · /report\n` +
        `   Admin:\n` +
        `     /stats · /broadcast · /pending\n` +
        `     /approve · /reject · /ban · /unban · /info\n` +
        `   Owner:\n` +
        `     /addcmd · /testcmd · /execute\n\n` +

        `─────────────────────────────\n` +
        `▸ Use /menu for buttons\n` +
        `▸ Use /help <command> for details\n` +
        `▸ Use /report to send bug reports\n\n` +
        `${config.footer}`;

    return "```\n" + body + "\n```";
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
                    parse_mode: "MarkdownV2"
                });
            } catch (err) {
                logger.warn(`[/help] image failed: ${err.message}`);
            }
        }

        // ─── Fallback: text only ────────────────────
        await ctx.reply(text, { parse_mode: "MarkdownV2" });
    }
};