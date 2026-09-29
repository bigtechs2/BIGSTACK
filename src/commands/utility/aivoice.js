// ──────────────────────────────────────────────────
//  BIGSTACK — /aivoice Command
//  Toggle AI voice replies on/off
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

// ══════════════════════════════════════════════════
//  Build status screen
// ══════════════════════════════════════════════════
function buildScreen(user) {
    const voiceOn = user.settings?.aiVoiceReplies === true;
    const status = voiceOn ? "◉ ON" : "○ OFF";

    return (
        `◈ *AI VOICE REPLIES*\n\n` +
        `▸ Status  ➤ ${status}\n\n` +
        `▸ When ON ⏤ the AI replies with voice notes\n` +
        `▸ When OFF ⏤ the AI replies with text\n\n` +
        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(user) {
    const voiceOn = user.settings?.aiVoiceReplies === true;

    return {
        inline_keyboard: [[
            voiceOn
                ? { text: "○ Turn OFF", callback_data: "aivoice:off" }
                : { text: "◉ Turn ON", callback_data: "aivoice:on" }
        ]]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "aivoice",
    aliases: ["voice", "tts"],
    category: "utility",
    description: "Toggle AI voice replies",
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
        const telegramId = String(ctx.from.id);

        let user = ctx.user || (await User.findOne({ telegramId }));
        if (!user) {
            user = await User.create({
                telegramId,
                firstName: ctx.from.first_name || null
            });
        }

        // Ensure settings object
        if (!user.settings) user.settings = {};
        if (typeof user.settings.aiVoiceReplies === "undefined") {
            user.settings.aiVoiceReplies = false;
        }

        await ctx.reply(buildScreen(user), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard(user)
        });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        {
            pattern: /^aivoice:on$/,
            handler: async (ctx) => {
                const telegramId = String(ctx.from.id);
                const user = await User.findOne({ telegramId });
                if (!user) {
                    return ctx.answerCallbackQuery({
                        text: "User not found",
                        show_alert: true
                    });
                }

                if (!user.settings) user.settings = {};
                user.settings.aiVoiceReplies = true;
                user.markModified("settings");
                await user.save();

                await ctx.answerCallbackQuery({ text: "◉ Voice replies ON" });

                try {
                    await ctx.editMessageText(buildScreen(user), {
                        parse_mode: "Markdown",
                        reply_markup: buildKeyboard(user)
                    });
                } catch { /* ignore */ }

                logger.info(`[/aivoice] ${telegramId} enabled voice replies`);
            }
        },
        {
            pattern: /^aivoice:off$/,
            handler: async (ctx) => {
                const telegramId = String(ctx.from.id);
                const user = await User.findOne({ telegramId });
                if (!user) {
                    return ctx.answerCallbackQuery({
                        text: "User not found",
                        show_alert: true
                    });
                }

                if (!user.settings) user.settings = {};
                user.settings.aiVoiceReplies = false;
                user.markModified("settings");
                await user.save();

                await ctx.answerCallbackQuery({ text: "○ Voice replies OFF" });

                try {
                    await ctx.editMessageText(buildScreen(user), {
                        parse_mode: "Markdown",
                        reply_markup: buildKeyboard(user)
                    });
                } catch { /* ignore */ }

                logger.info(`[/aivoice] ${telegramId} disabled voice replies`);
            }
        }
    ]
};
