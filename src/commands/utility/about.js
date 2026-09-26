// ──────────────────────────────────────────────────
//  BIGSTACK — /about Command
//  Bot information
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");

function buildAbout() {
    return (
        `◈ *ABOUT BIGSTACK* ◈\n\n` +

        `▸ Name      ➤ ${config.name}\n` +
        `▸ Version   ➤ ${config.version}\n` +
        `▸ Tagline   ➤ ${config.tagline}\n` +
        `▸ Developer ➤ @${config.owner.username}\n\n` +

        `*◈ CAPABILITIES*\n` +
        `   ➤ 16 download platforms\n` +
        `   ➤ 9 search commands\n` +
        `   ➤ AI assistant (chat + vision + voice)\n` +
        `   ➤ Coin economy with daily rewards\n` +
        `   ➤ Premium tier for power users\n\n` +

        `*◈ LINKS*\n` +
        `   ➤ Channel ➤ ${config.links?.channel || "-"}\n` +
        `   ➤ Support ➤ ${config.links?.support || "-"}\n` +
        `   ➤ Repo    ➤ ${config.links?.repo || "-"}\n\n` +

        `▸ ${config.footer}`
    );
}

module.exports = {
    name: "about",
    aliases: ["info", "bot"],
    category: "utility",
    description: "Bot information",
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
        await ctx.reply(buildAbout(), { parse_mode: "Markdown" });
    }
};