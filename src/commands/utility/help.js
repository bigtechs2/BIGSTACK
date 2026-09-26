// ──────────────────────────────────────────────────
//  BIGSTACK — /help Command
//  Full command list
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");

function buildHelp(prefix) {
    return (
        `◈ *BIGSTACK HELP* ◈\n\n` +

        `*◇ DOWNLOADER*\n` +
        `   ➤ ${prefix}play <song>\n` +
        `   ➤ ${prefix}ytmp3 <url>\n` +
        `   ➤ ${prefix}ytmp4 <url>\n` +
        `   ➤ ${prefix}spotify <url>\n` +
        `   ➤ ${prefix}spotifyplay <song>\n` +
        `   ➤ ${prefix}applemusic <url>\n` +
        `   ➤ ${prefix}soundcloud <url>\n` +
        `   ➤ ${prefix}instagram <url>\n` +
        `   ➤ ${prefix}tiktok <url>\n` +
        `   ➤ ${prefix}twitter <url>\n` +
        `   ➤ ${prefix}facebook <url>\n` +
        `   ➤ ${prefix}pinterest <url>\n` +
        `   ➤ ${prefix}gdrive <url>\n` +
        `   ➤ ${prefix}mediafire <url>\n` +
        `   ➤ ${prefix}terabox <url>\n` +
        `   ➤ ${prefix}github <url>\n\n` +

        `*◈ SEARCH*\n` +
        `   ➤ ${prefix}applesearch <query>\n` +
        `   ➤ ${prefix}spotifysearch <song>\n` +
        `   ➤ ${prefix}youtubesearch <video>\n` +
        `   ➤ ${prefix}pinterestsearch <query>\n` +
        `   ➤ ${prefix}imagesearch <query>\n` +
        `   ➤ ${prefix}lyrics <song>\n` +
        `   ➤ ${prefix}spotifylyric <url>\n` +
        `   ➤ ${prefix}happymod <app>\n` +
        `   ➤ ${prefix}whatmusic (reply audio)\n\n` +

        `*◉ AI*\n` +
        `   ➤ ${prefix}ai ⏤ open AI control center\n` +
        `   ➤ ${prefix}ai on / off ⏤ toggle AI\n\n` +

        `*▣ UTILITY*\n` +
        `   ➤ ${prefix}start ⏤ welcome\n` +
        `   ➤ ${prefix}menu ⏤ main menu\n` +
        `   ➤ ${prefix}help ⏤ this list\n` +
        `   ➤ ${prefix}about ⏤ bot info\n` +
        `   ➤ ${prefix}daily ⏤ claim coins\n` +
        `   ➤ ${prefix}balance ⏤ show balance\n` +
        `   ➤ ${prefix}refer ⏤ invite link\n` +
        `   ➤ ${prefix}profile ⏤ your stats\n` +
        `   ➤ ${prefix}store ⏤ buy coins\n` +
        `   ➤ ${prefix}settings ⏤ preferences\n\n` +

        `▸ Type any command to start`
    );
}

module.exports = {
    name: "help",
    aliases: ["commands", "cmds"],
    category: "utility",
    description: "Show all commands",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        await ctx.reply(buildHelp(config.prefix), { parse_mode: "Markdown" });
    }
};