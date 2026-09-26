// ──────────────────────────────────────────────────
//  BIGSTACK — /settings Command
//  User preferences
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const User = require("../../database/models/User");

// ══════════════════════════════════════════════════
//  Build settings screen
// ══════════════════════════════════════════════════
function buildSettings(user) {
    const s = user.settings || {};

    const onOff = (val) => (val ? "◉ ON" : "○ OFF");

    return (
        `◈ *SETTINGS*\n\n` +

        `◉ *Notifications*\n` +
        `   ➤ Bot messages  ➤ ${onOff(s.notifications)}\n\n` +

        `◉ *AI Voice*\n` +
        `   ➤ Voice replies ➤ ${onOff(s.aiVoiceReplies)}\n\n` +

        `◉ *Downloads*\n` +
        `   ➤ Auto-download ➤ ${onOff(s.autoDownload)}\n` +
        `   ➤ Quality       ➤ ${s.preferredQuality || "720p"}\n` +
        `   ➤ Format        ➤ ${s.preferredFormat || "auto"}\n\n` +

        `◉ *Appearance*\n` +
        `   ➤ Dark mode     ➤ ${onOff(s.darkMode)}\n` +
        `   ➤ Language      ➤ ${user.language || "en"}\n\n` +

        `▸ ${config.footer}`
    );
}

// ══════════════════════════════════════════════════
//  Build settings keyboard
// ══════════════════════════════════════════════════
function buildKeyboard(user) {
    const s = user.settings || {};
    const onOff = (val) => (val ? "◉" : "○");

    return {
        inline_keyboard: [
            [
                {
                    text: `${onOff(s.notifications)} Notifications`,
                    callback_data: "settings:toggle:notifications"
                }
            ],
            [
                {
                    text: `${onOff(s.aiVoiceReplies)} AI Voice Replies`,
                    callback_data: "settings:toggle:aiVoiceReplies"
                }
            ],
            [
                {
                    text: `${onOff(s.autoDownload)} Auto-Download`,
                    callback_data: "settings:toggle:autoDownload"
                }
            ],
            [
                {
                    text: `${onOff(s.darkMode)} Dark Mode`,
                    callback_data: "settings:toggle:darkMode"
                }
            ],
            [
                { text: "◀ Back to Menu", callback_data: "menu:home" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "settings",
    aliases: ["prefs", "preferences"],
    category: "utility",
    description: "Configure your preferences",
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
            user = await User.create({ telegramId, firstName: ctx.from.first_name });
        }

        await ctx.reply(buildSettings(user), {
            parse_mode: "Markdown",
            reply_markup: buildKeyboard(user)
        });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        {
            pattern: /^settings:toggle:(.+)$/,
            handler: async (ctx) => {
                const key = ctx.match[1];
                const telegramId = String(ctx.from.id);

                const user = await User.findOne({ telegramId });
                if (!user) {
                    return ctx.answerCallbackQuery({
                        text: "User not found",
                        show_alert: true
                    });
                }

                // Ensure settings object exists
                if (!user.settings) user.settings = {};
                if (typeof user.settings[key] === "undefined") {
                    return ctx.answerCallbackQuery({
                        text: "Unknown setting",
                        show_alert: true
                    });
                }

                // Toggle
                user.settings[key] = !user.settings[key];
                user.markModified("settings");
                await user.save();

                await ctx.answerCallbackQuery({
                    text: user.settings[key] ? "◉ Enabled" : "○ Disabled"
                });

                // Refresh screen
                try {
                    await ctx.editMessageText(buildSettings(user), {
                        parse_mode: "Markdown",
                        reply_markup: buildKeyboard(user)
                    });
                } catch {
                    // Message may be unchanged ⏤ ignore
                }

                logger.info(`[/settings] ${telegramId} toggled ${key} → ${user.settings[key]}`);
            }
        }
    ]
};