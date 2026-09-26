// ──────────────────────────────────────────────────
//  BIGSTACK — /whatmusic Command
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ══════════════════════════════════════════════════

const logger = require("../../core/logger");
const musicService = require("../../services/ai/music.service");
const uploadService = require("../../services/upload/nexray.service");
const { downloadTelegramFile, deleteFile } = require("../../utils/fileHelpers");

module.exports = {
    name: "whatmusic",
    aliases: ["shazam", "findsong", "whatsong"],
    category: "search",
    description: "Identify a song from an audio clip",
    emoji: "◈",
    usage: "<reply to an audio/voice message>",

    permissions: {
        coin: 5,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        // ─── Find audio source ──────────────────────
        const reply = ctx.message?.reply_to_message;
        const audio = reply?.audio || reply?.voice || ctx.message?.audio || ctx.message?.voice;

        if (!audio) {
            return ctx.reply(
                `◈ *WHATMUSIC*\n\n` +
                `Identify a song from audio.\n\n` +
                `▸ Usage\n` +
                `   ➤ Reply to an audio/voice with /whatmusic\n` +
                `   ➤ Or send audio with caption /whatmusic`,
                { parse_mode: "Markdown" }
            );
        }

        const loading = await ctx.reply("◐ Listening...");
        let filePath = null;

        try {
            filePath = await downloadTelegramFile(ctx, audio.file_id, "ogg");
            const uploaded = await uploadService.upload(filePath);

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                "◐ Identifying song...",
                { parse_mode: "Markdown" }
            );

            const result = await musicService.recognize(uploaded.url);

            let text =
                `◈ *${result.title}*\n\n` +
                `◉ Artist    ➤ ${result.artist}\n`;

            if (result.release)  text += `◐ Release   ➤ ${result.release}\n`;
            if (result.duration) text += `▣ Duration  ➤ ${result.duration}\n`;
            if (result.score)    text += `★ Match     ➤ ${result.score}%\n`;

            if (result.links.length) {
                text += `\n▸ Listen on\n`;
                for (const link of result.links) {
                    if (link.includes("spotify"))  text += `   ➤ [Spotify](${link})\n`;
                    if (link.includes("deezer"))   text += `   ➤ [Deezer](${link})\n`;
                    if (link.includes("youtu"))    text += `   ➤ [YouTube](${link})\n`;
                }
            }

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                text,
                { parse_mode: "Markdown", disable_web_page_preview: true }
            );

        } catch (err) {
            logger.error(`[/whatmusic] ${err.message}`);
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                "✗  Could not identify the song\n\n▸ Try a clearer clip (5-15 seconds)",
                { parse_mode: "Markdown" }
            ).catch(() => {});
        } finally {
            deleteFile(filePath);
        }
    }
};