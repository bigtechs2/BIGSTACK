// ──────────────────────────────────────────────────
//  BIGSTACK — /execute Command
//  Run JS and return output (owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const util = require("util");
const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const services = require("../../services");

const AsyncFunction = Object.getPrototypeOf(async function () {})
    .constructor;

// ══════════════════════════════════════════════════
//  Sanitize output for Telegram
// ══════════════════════════════════════════════════
function safeOutput(value) {
    let str;

    if (typeof value === "string") {
        str = value;
    } else if (value === undefined) {
        str = "undefined";
    } else {
        str = util.inspect(value, {
            depth: 3,
            colors: false,
            maxArrayLength: 20,
            maxStringLength: 500
        });
    }

    // Truncate for Telegram
    if (str.length > 3500) {
        str = str.slice(0, 3500) + "\n... (truncated)";
    }

    return str;
}

// ══════════════════════════════════════════════════
//  Run JS code
// ══════════════════════════════════════════════════
async function runJS(code, ctx) {
    const fn = new AsyncFunction(
        "require", "config", "services", "cache", "logger", "ctx",
        code
    );

    return await fn(require, config, services, cache, logger, ctx);
}

// ══════════════════════════════════════════════════
//  Command
// ══════════════════════════════════════════════════
module.exports = {
    name: "execute",
    aliases: ["exec", "eval"],
    category: "utility",
    description: "Execute JS code (owner only)",
    emoji: "◈",
    usage: "<code>",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const code = ctx.args.join(" ").trim();

        if (!code) {
            return ctx.reply(
                `◈ *EXECUTE*\n\n` +
                `▸ Run JavaScript on the VPS\n\n` +
                `◈ *Examples*\n` +
                `   \`/execute 2 + 2\`\n` +
                `   \`/execute Object.keys(services)\`\n` +
                `   \`/execute await services.play.search("faded")\`\n` +
                `   \`/execute process.memoryUsage()\`\n\n` +
                `◈ *Available*\n` +
                `   ➤ require\n` +
                `   ➤ config\n` +
                `   ➤ services\n` +
                `   ➤ cache\n` +
                `   ➤ logger\n` +
                `   ➤ ctx (current message)\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );
        }

        logger.info(`[/execute] ${ctx.from.id}: ${code.slice(0, 80)}`);

        const loading = await ctx.reply("◐ Executing...");

        const startAt = Date.now();

        try {
            const result = await runJS(code, ctx);
            const elapsed = Date.now() - startAt;

            const output = safeOutput(result);

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `✓ *Output* (${elapsed}ms)\n\n` +
                "```\n" +
                output +
                "\n```",
                { parse_mode: "Markdown" }
            ).catch(async () => {
                // Fallback without markdown
                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    `✓ Output (${elapsed}ms)\n\n${output}`
                );
            });

        } catch (err) {
            const elapsed = Date.now() - startAt;

            logger.error(`[/execute] failed: ${err.message}`);

            const errMsg = err.stack || err.message;

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `✗ *Error* (${elapsed}ms)\n\n` +
                "```\n" +
                errMsg.slice(0, 2000) +
                "\n```",
                { parse_mode: "Markdown" }
            ).catch(() => {});
        }
    }
};