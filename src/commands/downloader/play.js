const { InputFile } = require("grammy");
const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const { convertMedia } = require("../../utils/mediaConverter");

module.exports = {
    name: "play",
    aliases: ["ytplay", "music", "song"],
    category: "downloader",
    permissions: { coin: 10 },
    code: async (ctx) => {
        const query = ctx.args.join(" ").trim();
        if (!query) return ctx.reply(`◈ *PLAYER*\nUsage: /play <song name>`, { parse_mode: "Markdown" });

        const loading = await ctx.reply(`🔍 *Searching...*\nLooking for *${query}*`, { parse_mode: "Markdown" });

        try {
            const { data } = await axios.get('https://api.azbry.com/api/download/ytplay', { params: { q: query }, timeout: 30000 });
            if (!data.status || !data.result) throw new Error("No results");

            const r = data.result;
            const title = r.title || 'Unknown';
            const channel = r.channel || 'Unknown';
            const thumb = r.thumbnail || config.branding.thumbnail;
            const videoUrl = r.url || '';
            const downloadUrl = r.download || '';

            await ctx.api.editMessageText(ctx.chat.id, loading.message_id, `⏳ *Downloading & Converting...*\n${title}`, { parse_mode: "Markdown" });

            const audioRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 45000 });
            const rawBuffer = Buffer.from(audioRes.data);
            
            // Convert to standard MP3
            const audioBuffer = await convertMedia(rawBuffer, "mp3");

            // Edit the message to the final "Rich Card"
            const card = `🎵 *${title}*\n\n` +
                         `👤 *Artist:* ${channel}\n` +
                         `📡 *Provider:* Azbry\n\n` +
                         `🔗 [Watch on YouTube](${videoUrl})`;
            
            const keyboard = {
                inline_keyboard: [[
                    { text: "📥 Download Video (MP4)", callback_data: `getmp4:${videoUrl}` }
                ]]
            };

            await ctx.api.editMessageText(ctx.chat.id, loading.message_id, card, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });

            // Send the audio file
            await ctx.replyWithAudio(new InputFile(audioBuffer, `${title}.mp3`), {
                title: title,
                performer: channel,
                caption: `🎵 ${title} — ${channel}`
            });

        } catch (error) {
            await ctx.api.editMessageText(ctx.chat.id, loading.message_id, `❌ *Error*\nCould not download this song.`, { parse_mode: "Markdown" });
            logger.error(`[/play] ${error.message}`);
        }
    }
};