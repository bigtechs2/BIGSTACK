// ──────────────────────────────────────────────────
//  BIGSTACK — /addcmd Command
//  Add new command dynamically (owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const validator = require("../../utils/cmdValidator");

const execAsync = promisify(exec);

// ══════════════════════════════════════════════════
//  Save command file
// ══════════════════════════════════════════════════
async function saveCommandFile(meta, code) {
    const dir = path.join(__dirname, "..", meta.category);

    // Ensure folder exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${meta.name}.js`);

    // ─── Backup if exists ────────────────────────────
    if (fs.existsSync(filePath)) {
        const backup = filePath + ".bak";
        fs.copyFileSync(filePath, backup);
        logger.info(`[addcmd] backup created: ${backup}`);
    }

    // ─── Write file ──────────────────────────────────
    fs.writeFileSync(filePath, code, "utf8");

    // ─── Verify it loads ─────────────────────────────
    try {
        delete require.cache[require.resolve(filePath)];
        require(filePath);
    } catch (err) {
        // ─── Rollback ────────────────────────────────
        if (fs.existsSync(filePath + ".bak")) {
            fs.copyFileSync(filePath + ".bak", filePath);
        }
        throw new Error(`Load failed: ${err.message}`);
    }

    return filePath;
}

// ══════════════════════════════════════════════════
//  PM2 restart
// ══════════════════════════════════════════════════
async function restartBot() {
    try {
        const { stdout, stderr } = await execAsync("pm2 restart bigstack");
        return { ok: true, output: stdout + stderr };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ══════════════════════════════════════════════════
//  Build preview message
// ══════════════════════════════════════════════════
function buildPreview(meta) {
    const aliases = meta.aliases.length
        ? meta.aliases.map((a) => `/${a}`).join(", ")
        : "none";

    const callbacks = meta.callbacks > 0
        ? `${meta.callbacks} callback(s)`
        : "none";

    return (
        `◈ *COMMAND PREVIEW*\n\n` +
        `▸ Name       ➤ \`/${meta.name}\`\n` +
        `▸ Aliases    ➤ ${aliases}\n` +
        `▸ Category   ➤ ${meta.category}\n` +
        `▸ Emoji      ➤ ${meta.emoji}\n` +
        `▸ Description ➤ ${meta.description || "—"}\n` +
        `▸ Usage      ➤ ${meta.usage || "—"}\n` +
        `▸ Callbacks  ➤ ${callbacks}\n\n` +
        `▸ Coin cost  ➤ ${meta.permissions.coin || 0}\n` +
        `▸ Owner only ➤ ${meta.permissions.owner || false}\n` +
        `▸ Admin only ➤ ${meta.permissions.admin || false}\n` +
        `▸ Premium    ➤ ${meta.permissions.premium || false}\n\n` +
        `▸ All checks passed ✓\n\n` +
        `▸ Reply to confirm:\n` +
        `   [✓ Save & Restart]  [✗ Cancel]`
    );
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "addcmd",
    aliases: ["newcmd", "installcmd"],
    category: "utility",
    description: "Add a new command (owner only)",
    emoji: "◈",
    usage: "[reply to a script] or send script next",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const userId = String(ctx.from.id);
        const replied = ctx.message?.reply_to_message;

        // ═══════════════════════════════════════════
        //  Case A: Reply to a message
        // ═══════════════════════════════════════════
        if (replied) {
            const rawText = replied.text || replied.caption || "";
            if (!rawText) {
                return ctx.reply("✗  Replied message has no text.");
            }

            return processScript(ctx, rawText);
        }

        // ═══════════════════════════════════════════
        //  Case B: Wait for script in next message
        // ═══════════════════════════════════════════
        await cache.set(`addcmd:await:${userId}`, true, 300);

        await ctx.reply(
            `◈ *ADD COMMAND*\n\n` +
            `▸ Send me the command script.\n\n` +
            `▸ Required fields:\n` +
            `   ➤ \`name\` ⏤ command trigger\n` +
            `   ➤ \`code\` ⏤ async function\n` +
            `   ➤ \`category\` ⏤ player, downloader, search, utility, webapp\n\n` +
            `▸ Optional:\n` +
            `   ➤ \`aliases\`, \`description\`, \`usage\`, \`permissions\`\n\n` +
            `▸ You can also reply to a script with /addcmd\n\n` +
            `▸ Cancel: /cancel`,
            { parse_mode: "Markdown" }
        );
    }
};

// ══════════════════════════════════════════════════
//  Process the script
// ══════════════════════════════════════════════════
async function processScript(ctx, rawText) {
    const userId = String(ctx.from.id);

    // ─── Validate ────────────────────────────────────
    const result = validator.validate(rawText);

    if (!result.ok) {
        const errors = result.errors.map((e) => `   ➤ ${e}`).join("\n");
        return ctx.reply(
            `✗ *VALIDATION FAILED*\n\n${errors}\n\n` +
            `▸ Fix the errors and try again.`,
            { parse_mode: "Markdown" }
        );
    }

    // ─── Store code for confirmation ─────────────────
    await cache.set(`addcmd:pending:${userId}`, {
        code: result.code,
        meta: result.meta,
        filename: result.filename
    }, 300);

    // ─── Show preview + buttons ──────────────────────
    const preview = buildPreview(result.meta);

    await ctx.reply(preview, {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "✓ Save & Restart", callback_data: "addcmd:save" },
                    { text: "✗ Cancel", callback_data: "addcmd:cancel" }
                ]
            ]
        }
    });

    logger.info(`[/addcmd] ${userId} preview: ${result.meta.category}/${result.meta.name}`);
}