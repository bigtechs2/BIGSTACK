// ──────────────────────────────────────────────────
//  BIGSTACK — Live Progress Message
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Creates a message that updates its elapsed
//  time every second. Returns a controller to
//  update or finalize it.
//
//  Usage:
//    const progress = await startProgress(ctx, {
//        emoji: "♬",
//        title: "Downloading MP3...",
//        command: "ytmp3",
//        input: url
//    });
//    progress.setProvider("azbry");
//    await progress.finish({ success: true, title: "Sent!" });
// ──────────────────────────────────────────────────

const logger = require("../core/logger");

// ═══════════════════════════════════════════════
//  Tick interval (ms)
// ═══════════════════════════════════════════════
const TICK_INTERVAL = 1000;

// ═══════════════════════════════════════════════
//  Format elapsed time
// ═══════════════════════════════════════════════
function formatElapsed(ms) {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

// ═══════════════════════════════════════════════
//  Truncate long input
// ═══════════════════════════════════════════════
function truncate(str, max = 40) {
    if (!str) return "";
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

// ═══════════════════════════════════════════════
//  Build the loading text
// ═══════════════════════════════════════════════
function buildLoadingText(state) {
    const lines = [
        `${state.emoji} *${state.title}*`,
        ``,
        `◈ Command   ➤  \`/${state.command}\``,
        `◉ Input     ➤  \`${truncate(state.input)}\``
    ];

    if (state.provider) {
        lines.push(`⊛ Provider  ➤  \`${state.provider}\``);
    }

    lines.push(``);
    lines.push(`⏱ Elapsed: \`${formatElapsed(Date.now() - state.startedAt)}\``);

    if (state.note) {
        lines.push(``);
        lines.push(state.note);
    }

    lines.push(``);
    lines.push(state.footer);

    return lines.join("\n");
}

// ═══════════════════════════════════════════════
//  Build the finished text
// ═══════════════════════════════════════════════
function buildFinishText(state, options = {}) {
    const elapsed = formatElapsed(Date.now() - state.startedAt);
    const success = options.success !== false;

    const emoji = success ? "✓" : "✗";
    const title = options.title || (success ? "Complete" : "Failed");

    const lines = [
        `${emoji} *${title}*`,
        ``,
        `◈ Command   ➤  \`/${state.command}\``,
        `◉ Input     ➤  \`${truncate(state.input)}\``
    ];

    if (state.provider) {
        lines.push(`⊛ Provider  ➤  \`${state.provider}\``);
    }

    lines.push(`⏱ Elapsed: \`${elapsed}\``);

    if (options.extra) {
        lines.push(``);
        lines.push(options.extra);
    }

    lines.push(``);
    lines.push(state.footer);

    return lines.join("\n");
}

// ═══════════════════════════════════════════════
//  Fallback controller (no-op)
// ═══════════════════════════════════════════════
function createNoopController() {
    return {
        setProvider() {},
        setNote() {},
        setTitle() {},
        setEmoji() {},
        stop() {},
        async finish() {},
        async delete() {},
        chatId: null,
        messageId: null,
        getState() {
            return {};
        }
    };
}

// ═══════════════════════════════════════════════
//  Main: start a live progress message
// ═══════════════════════════════════════════════
async function startProgress(ctx, options = {}) {
    // ─── Read config safely ─────────────────────
    let config = {};
    let footerText = "© BIGSTACK by bigmanjtech™ with ♥︎";

    try {
        config = require("../config");
        footerText = config.footer || config.branding?.footer || footerText;
    } catch {
        // Config not loaded yet — use default footer
    }

    // ─── Build state ────────────────────────────
    const state = {
        emoji: options.emoji || "◐",
        title: options.title || "Processing...",
        command: options.command || ctx.commandName || "unknown",
        input: options.input || (ctx.args?.join(" ") || ""),
        provider: options.provider || null,
        note: options.note || null,
        footer: footerText,
        startedAt: Date.now()
    };

    // ─── Send initial message ───────────────────
    let message;
    try {
        message = await ctx.reply(buildLoadingText(state), {
            parse_mode: "Markdown"
        });
    } catch (err) {
        logger.warn(`[progress] failed to send initial message: ${err.message}`);
        return createNoopController();
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;

    // ─── Set up ticker ──────────────────────────
    let stopped = false;
    let lastText = buildLoadingText(state);

    const ticker = setInterval(async () => {
        if (stopped) return;

        const text = buildLoadingText(state);
        if (text === lastText) return;

        try {
            await ctx.api.editMessageText(chatId, messageId, text, {
                parse_mode: "Markdown"
            });
            lastText = text;
        } catch (err) {
            // Silent — rate limits, identical text, deleted message, etc.
        }
    }, TICK_INTERVAL);

    // ─── Return controller ──────────────────────
    return {
        // ─── Live updates ───────────────────────
        setProvider(provider) {
            state.provider = provider;
        },
        setNote(note) {
            state.note = note;
        },
        setTitle(title) {
            state.title = title;
        },
        setEmoji(emoji) {
            state.emoji = emoji;
        },

        // ─── Stop the ticker ────────────────────
        stop() {
            stopped = true;
            clearInterval(ticker);
        },

        // ─── Final update ───────────────────────
        async finish(options = {}) {
            stopped = true;
            clearInterval(ticker);

            // Allow custom text override
            const finalText = options.text || buildFinishText(state, options);

            try {
                await ctx.api.editMessageText(chatId, messageId, finalText, {
                    parse_mode: "Markdown"
                });
            } catch (err) {
                // Message might be deleted — ignore
            }
        },

        // ─── Delete the message ─────────────────
        async delete() {
            stopped = true;
            clearInterval(ticker);
            try {
                await ctx.api.deleteMessage(chatId, messageId);
            } catch {
                // Ignore
            }
        },

        // ─── Exposed IDs ────────────────────────
        chatId,
        messageId,

        // ─── Read current state ─────────────────
        getState() {
            return { ...state };
        }
    };
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    startProgress,
    formatElapsed
};