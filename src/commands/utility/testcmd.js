// ──────────────────────────────────────────────────
//  BIGSTACK — /testcmd Command
//  Test if a command is valid (owner)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const logger = require("../../core/logger");
const cmdManager = require("../../services/system/cmdManager.service");

// ══════════════════════════════════════════════════
//  Find command file by name
// ══════════════════════════════════════════════════
function findCommand(name) {
    for (const category of cmdManager.ALLOWED_CATEGORIES) {
        const filePath = path.join(
            cmdManager.COMMANDS_DIR,
            category,
            `${name}.js`
        );
        if (fs.existsSync(filePath)) {
            return { category, filePath };
        }
    }
    return null;
}

// ══════════════════════════════════════════════════
//  Command
// ══════════════════════════════════════════════════
module.exports = {
    name: "testcmd",
    aliases: ["checkcmd", "validatecmd"],
    category: "utility",
    description: "Test if a command works (owner)",
    emoji: "◈",
    usage: "<command name>",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const target = ctx.args[0]?.replace(/^\//, "").toLowerCase();

        if (!target) {
            return ctx.reply(
                `◈ *TEST COMMAND*\n\n` +
                `▸ Usage: \`/testcmd <command>\`\n\n` +
                `▸ Example: \`/testcmd play\``,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Find file ──────────────────────────────
        const found = findCommand(target);
        if (!found) {
            return ctx.reply(
                `✗ *Command not found*\n\n` +
                `▸ "/${target}" does not exist.`,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Try to load ────────────────────────────
        let cmd;
        try {
            delete require.cache[require.resolve(found.filePath)];
            cmd = require(found.filePath);
        } catch (err) {
            return ctx.reply(
                `✗ *Load failed*\n\n` +
                `▸ Category ➤ ${found.category}\n` +
                `▸ Error    ➤ \`${err.message}\``,
                { parse_mode: "Markdown" }
            );
        }

        // ─── Validate structure ─────────────────────
        const issues = [];
        if (!cmd.name) issues.push("Missing `name`");
        if (typeof cmd.code !== "function") issues.push("Missing `code` function");
        if (!cmd.category) issues.push("Missing `category`");
        if (cmd.aliases && !Array.isArray(cmd.aliases))
            issues.push("`aliases` must be array");

        // ─── Build response ─────────────────────────
        const perms = cmd.permissions || {};

        const permLines = [];
        if (perms.coin)              permLines.push(`   ➤ Coin    ➤ ${perms.coin}`);
        if (perms.owner)             permLines.push(`   ➤ Owner   ➤ ✓`);
        if (perms.admin)             permLines.push(`   ➤ Admin   ➤ ✓`);
        if (perms.premium)           permLines.push(`   ➤ Premium ➤ ✓`);
        if (perms.group)             permLines.push(`   ➤ Group   ➤ ✓`);
        if (perms.private)           permLines.push(`   ➤ Private ➤ ✓`);

        const lines = [
            `◈ *COMMAND INFO*`,
            ``,
            `▸ Name      ➤ \`/${cmd.name}\``,
            `▸ Aliases   ➤ ${cmd.aliases?.length ? cmd.aliases.map((a) => "/" + a).join(", ") : "none"}`,
            `▸ Category  ➤ ${cmd.category}`,
            `▸ File      ➤ \`src/commands/${found.category}/${target}.js\``,
            `▸ Desc      ➤ ${cmd.description || "—"}`,
            ``
        ];

        if (permLines.length) {
            lines.push(`◈ *Permissions*`);
            lines.push(...permLines);
            lines.push(``);
        }

        lines.push(`◈ *Status*`);
        lines.push(
            issues.length === 0
                ? `   ✓ All checks passed`
                : issues.map((i) => `   ✗ ${i}`).join("\n")
        );

        lines.push(``);
        lines.push(`▸ ${config.footer}`);

        logger.info(`[/testcmd] ${target} → ${issues.length} issue(s)`);

        await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
    }
};