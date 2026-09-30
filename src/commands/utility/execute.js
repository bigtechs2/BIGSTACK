// ──────────────────────────────────────────────────
//  BIGSTACK — /execute Command
//  Run arbitrary JS in isolated context (owner only)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const vm = require("vm");
const { exec } = require("child_process");
const { promisify } = require("util");

const config = require("../../config");
const logger = require("../../core/logger");
const validator = require("../../utils/cmdValidator");

const execAsync = promisify(exec);

// ══════════════════════════════════════════════════
//  Run JS in sandbox
// ══════════════════════════════════════════════════
async function runJs(code) {
    const logs = [];

    // ─── Capture console.log ────────────────────────
    const captureConsole = {
        log: (...args) => logs.push(args.map(String).join(" ")),
        error: (...args) => logs.push("ERR: " + args.map(String).join(" ")),
        warn: (...args) => logs.push("WARN: " + args.map(String).join(" ")),
        info: (...args) => logs.push("INFO: " + args.map(String).join(" "))
    };

    // ─── Sandbox ────────────────────────────────────
    const sandbox = {
        console: captureConsole,
        require,
        process,
        Buffer,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Promise,
        Date,
        Math,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Error,
        RegExp,
        Map,
        Set,
        Symbol,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        global
    };

    const context = vm.createContext(sandbox);

    // ─── Run ────────────────────────────────────────
    const startTime = Date.now();

    let result;
    let error = null;

    try {
        result = vm.runInContext(code, context, { timeout: 10000 });
    } catch (err) {
        error = err;
    }

    const duration = Date.now() - startTime;

    return { logs, result, error, duration };
}

// ══════════════════════════════════════════════════
//  Run shell command
// ══════════════════════════════════════════════════
async function runShell(command) {
    try {
        const { stdout, stderr } = await execAsync(command, {
            timeout: 30000,
            maxBuffer: 1024 * 1024
        });
        return { ok: true, stdout, stderr };
    } catch (err) {
        return {
            ok: false,
            stdout: err.stdout || "",
            stderr: err.stderr || "",
            error: err.message
        };
    }
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "execute",
    aliases: ["exec", "eval", "run", "sh"],
    category: "utility",
    description: "Execute JS or shell (owner only)",
    emoji: "◈",
    usage: "<code> or reply to a code block",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const args = ctx.args.join(" ").trim();
        const replied = ctx.message?.reply_to_message;
        const repliedText = replied?.text || replied?.caption || "";

        // ═══════════════════════════════════════════
        //  Get the code to run
        // ═══════════════════════════════════════════
        let code = null;

        if (args) {
            // Inline: /execute 2+2
            code = args;
        } else if (repliedText) {
            // Reply: extract from block
            code = validator.extractCode(repliedText);
        }

        if (!code) {
            return ctx.reply(
                `◈ *EXECUTE*\n\n` +
                `▸ Run JavaScript in sandbox\n\n` +
                `▸ Usage:\n` +
                `   ➤ \`/execute <code>\`\n` +
                `   ➤ \`/execute\` (reply to a code block)\n` +
                `   ➤ \`/sh <command>\` ⏤ shell\n\n` +
                `▸ Examples:\n` +
                `   ➤ \`/execute 2 + 2\`\n` +
                `   ➤ \`/execute Object.keys(require("os").cpus()).length\`\n` +
                `   ➤ \`/sh df -h\`\n` +
                `   ➤ \`/sh pm2 status\``,
                { parse_mode: "Markdown" }
            );
        }

        // ═══════════════════════════════════════════
        //  Detect shell vs JS
        // ═══════════════════════════════════════════
        const isShell = ctx.commandName === "sh" || ctx.match?.startsWith("sh ");

        logger.info(`[/execute] ${ctx.from.id} ${isShell ? "shell" : "js"}: ${code.slice(0, 50)}`);

        // ═══════════════════════════════════════════
        //  Run shell
        // ═══════════════════════════════════════════
        if (isShell) {
            const out = await runShell(code);
            const body =
                `◈ *SHELL*\n\n` +
                `▸ Command\n\`\`\`\n${code}\n\`\`\`\n\n` +
                `▸ Output\n\`\`\`\n${(out.stdout || out.stderr || out.error || "no output").slice(0, 3500)}\n\`\`\``;

            return ctx.reply(body, { parse_mode: "Markdown" });
        }

        // ═══════════════════════════════════════════
        //  Run JS
        // ═══════════════════════════════════════════
        const { logs, result, error, duration } = await runJs(code);

        const lines = [
            `◈ *EXECUTE*`,
            ``,
            `▸ *Code*`,
            `\`\`\``,
            code.slice(0, 500),
            `\`\`\``,
            ``
        ];

        if (logs.length > 0) {
            lines.push(`▸ *Console*`);
            lines.push(`\`\`\``);
            lines.push(logs.join("\n").slice(0, 1500));
            lines.push(`\`\`\``);
            lines.push(``);
        }

        if (error) {
            lines.push(`▸ *Error*`);
            lines.push(`\`\`\``);
            lines.push(error.message.slice(0, 500));
            lines.push(`\`\`\``);
        } else {
            lines.push(`▸ *Result*`);
            lines.push(`\`\`\``);
            lines.push(String(result).slice(0, 1000));
            lines.push(`\`\`\``);
        }

        lines.push(``);
        lines.push(`▸ *Duration* ➤ ${duration}ms`);

        await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
    }
};