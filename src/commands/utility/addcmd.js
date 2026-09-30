// ──────────────────────────────────────────────────
//  BIGSTACK — /addcmd Command
//  Add new commands live (owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const cmdManager = require("../../services/system/cmdManager.service");

// ─── State key ──────────────────────────────────────
const STATE_KEY = (userId) => `awaiting:addcmd:${userId}`;

// ══════════════════════════════════════════════════
//  Process incoming script
// ══════════════════════════════════════════════════
async function processScript(ctx, rawText) {
    const userId = String(ctx.from.id);

    // ─── Clear state ────────────────────────────────
    await cache.del(STATE_KEY(userId));

    logger.info(
        `[/addcmd] ${userId} submitting script (${rawText.length} chars)`
    );

    // ─── 1. Validate ────────────────────────────────
    const check = cmdManager.validateScript(rawText);

    if (!check.valid) {
        return ctx.reply(
            `✗ *Invalid Script*\n\n` +
            `▸ Reason\n` +
            `   ${check.reason}\n\n` +
            `▸ Required\n` +
            `   ➤ \`module.exports = { ... }\`\n` +
            `   ➤ \`name: "..."\`\n` +
            `   ➤ \`category: "..."\`\n` +
            `   ➤ \`code: async (ctx) => { ... }\`\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    }

    const { metadata, clean } = check;

    // ─── 2. Write file ──────────────────────────────
    try {
        cmdManager.writeCommand(metadata, clean);
    } catch (err) {
        logger.error(`[/addcmd] write failed: ${err.message}`);
        return ctx.reply(`✗ Could not save: ${err.message}`);
    }

    // ─── 3. Confirm ─────────────────────────────────
    await ctx.reply(
        `◈ *Command Saved*\n\n` +
        `▸ Name     ➤ \`/${metadata.name}\`\n` +
        `▸ Category ➤ ${metadata.category}\n` +
        `▸ Aliases  ➤ ${
            metadata.aliases.length
                ? metadata.aliases.map((a) => "/" + a).join(", ")
                : "none"
        }\n` +
        `▸ Desc     ➤ ${metadata.description}\n` +
        `▸ File     ➤ \`src/commands/${metadata.category}/${metadata.name}.js\`\n\n` +
        `◐ Restarting bot to load it...\n` +
        `▸ You'll see "✓ Online" in a few seconds.`,
        { parse_mode: "Markdown" }
    );

    // ─── 4. Restart PM2 (async, no await) ───────────
    setTimeout(() => {
        cmdManager
            .restartPM2()
            .then(({ stdout }) => {
                logger.info(
                    `[/addcmd] ✓ PM2 restarted: ${stdout.split("\n")[0]}`
                );
            })
            .catch((err) => {
                logger.error(`[/addcmd] PM2 restart failed: ${err.message}`);
            });
    }, 1500); // wait for reply to send
}

// ══════════════════════════════════════════════════
//  Command
// ══════════════════════════════════════════════════
module.exports = {
    name: "addcmd",
    aliases: ["addcommand", "newcmd"],
    category: "utility",
    description: "Add a new command (owner)",
    emoji: "◈",
    usage: "[script or reply]",

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

        // ─── Case A ⏤ reply to a message ────────────
        const replyMsg = ctx.message?.reply_to_message;
        if (replyMsg) {
            const text = replyMsg.text || replyMsg.caption || "";
            if (text.length > 30) {
                return processScript(ctx, text);
            }
        }

        // ─── Case B ⏤ inline script (short) ─────────
        const inlineScript = ctx.args.join(" ").trim();
        if (inlineScript.length > 50) {
            return processScript(ctx, inlineScript);
        }

        // ─── Case C ⏤ wait for next message ─────────
        await cache.set(STATE_KEY(userId), true, 600);

        return ctx.reply(
            `◈ *ADD COMMAND*\n\n` +
            `▸ Send me the command script\n\n` +
            `◈ *Ways to send*\n` +
            `   ➤ As code block\n` +
            `   ➤ Reply to a message with /addcmd\n` +
            `   ➤ Inline: \`/addcmd <script>\`\n\n` +
            `◈ *Bot will*\n` +
            `   ✓ Validate the script\n` +
            `   ✓ Detect the category\n` +
            `   ✓ Save the file\n` +
            `   ✓ Restart to load it\n\n` +
            `▸ Cancel: /cancel\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    },

    // ─── Called by state middleware ─────────────────
    processState: async (ctx, text) => processScript(ctx, text)
};