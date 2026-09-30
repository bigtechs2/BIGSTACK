// ──────────────────────────────────────────────────
//  BIGSTACK — /testcmd Command
//  Validate a command without saving (owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const validator = require("../../utils/cmdValidator");

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "testcmd",
    aliases: ["validatecmd", "checkcmd"],
    category: "utility",
    description: "Test a command script without saving it",
    emoji: "◈",
    usage: "[reply to a script]",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const replied = ctx.message?.reply_to_message;

        if (!replied) {
            return ctx.reply(
                `◈ *TEST COMMAND*\n\n` +
                `▸ Reply to a script with /testcmd\n` +
                `▸ Bot validates it without saving\n\n` +
                `▸ Checks:\n` +
                `   ➤ Syntax\n` +
                `   ➤ Required fields\n` +
                `   ➤ Category validity\n` +
                `   ➤ Permission structure`,
                { parse_mode: "Markdown" }
            );
        }

        const rawText = replied.text || replied.caption || "";
        if (!rawText) {
            return ctx.reply("✗  Replied message has no text.");
        }

        // ─── Validate ────────────────────────────────
        const result = validator.validate(rawText);

        if (!result.ok) {
            const errors = result.errors.map((e) => `   ➤ ${e}`).join("\n");
            return ctx.reply(
                `✗ *INVALID*\n\n${errors}\n\n` +
                `▸ Fix and try /testcmd again.`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Success ⏤ show metadata ────────────────
        const m = result.meta;

        const aliases = m.aliases.length
            ? m.aliases.map((a) => `/${a}`).join(", ")
            : "none";

        const callbacks = m.callbacks > 0
            ? `${m.callbacks} callback(s)`
            : "none";

        await ctx.reply(
            `✓ *VALID COMMAND*\n\n` +
            `▸ Name       ➤ \`/${m.name}\`\n` +
            `▸ Aliases    ➤ ${aliases}\n` +
            `▸ Category   ➤ ${m.category}\n` +
            `▸ Emoji      ➤ ${m.emoji}\n` +
            `▸ Description ➤ ${m.description || "—"}\n` +
            `▸ Usage      ➤ ${m.usage || "—"}\n` +
            `▸ Callbacks  ➤ ${callbacks}\n\n` +
            `▸ Coin cost  ➤ ${m.permissions.coin || 0}\n` +
            `▸ Owner only ➤ ${m.permissions.owner || false}\n` +
            `▸ Admin only ➤ ${m.permissions.admin || false}\n` +
            `▸ Premium    ➤ ${m.permissions.premium || false}\n\n` +
            `▸ Use /addcmd to install it.`,
            { parse_mode: "Markdown" }
        );

        logger.info(`[/testcmd] ${ctx.from.id} validated: ${m.category}/${m.name}`);
    }
};