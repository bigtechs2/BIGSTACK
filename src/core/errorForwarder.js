// ──────────────────────────────────────────────────
//  BIGSTACK — Error Forwarder
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Thin wrapper around logger.errorToGroup().
//  Central place for error routing rules.
// ──────────────────────────────────────────────────

const logger = require("./logger");
const config = require("../config");

// ─── Check if error forwarding is enabled ───────────
function isEnabled() {
    return config.logging?.groups?.enabled === true &&
           !!config.logging?.groups?.errors?.id;
}

// ══════════════════════════════════════════════════
//  🚨 FORWARD AN ERROR
// ══════════════════════════════════════════════════

/**
 * Forward an error to the ERRORS group.
 * @param {Error} error - The error to forward
 * @param {Object} context - Context object (user, command, etc.)
 * @returns {Promise<boolean>} - true if sent, false if skipped
 */
async function forward(error, context = {}) {
    if (!isEnabled()) return false;

    // ─── Skip known noisy errors ────────────────────
    if (shouldSkip(error)) {
        logger.debug(`[errorForwarder] skipped: ${error.message}`);
        return false;
    }

    try {
        await logger.errorToGroup(error, context);
        return true;
    } catch (err) {
        logger.warn(`[errorForwarder] forwarding failed: ${err.message}`);
        return false;
    }
}

// ─── Errors we don't care about ─────────────────────
function shouldSkip(error) {
    const msg = error?.message || "";

    // Telegram says the message is too old to edit
    if (msg.includes("message to edit not found")) return true;
    if (msg.includes("message is not modified")) return true;

    // User blocked the bot
    if (msg.includes("bot was blocked by the user")) return true;
    if (msg.includes("user is deactivated")) return true;

    // Chat not found
    if (msg.includes("chat not found")) return true;

    // Query is too old (callback timeout)
    if (msg.includes("query is too old")) return true;

    return false;
}

// ─── Convenience wrappers for common cases ──────────

async function forwardCommandError(error, ctx) {
    return forward(error, {
        command: ctx?.commandName || "unknown",
        user: ctx?.from
            ? `${ctx.from.first_name || ""} (@${ctx.from.username || "no-username"}) [${ctx.from.id}]`
            : "unknown",
        chatType: ctx?.chat?.type || "unknown",
        chatId: ctx?.chat?.id || "unknown",
        input: ctx?.args?.length ? ctx.args.join(" ") : ctx?.match || "",
        metadata: {
            updateId: ctx?.update?.update_id,
            messageId: ctx?.message?.message_id,
            source: "middleware"
        }
    });
}

async function forwardGlobalError(error, ctx) {
    return forward(error, {
        command: ctx?.commandName || "global",
        user: ctx?.from
            ? `@${ctx.from.username || "no-username"} [${ctx.from.id}]`
            : "unknown",
        chatType: ctx?.chat?.type || "unknown",
        metadata: {
            updateId: ctx?.update?.update_id,
            source: "bot.catch"
        }
    });
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    forward,
    forwardCommandError,
    forwardGlobalError,
    isEnabled
};