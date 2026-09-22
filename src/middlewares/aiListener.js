// ──────────────────────────────────────────────────
//  BIGSTACK — AI Listener Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Catches plain messages from users with AI ON.
//  Skips commands, bots, groups without tag.
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const session = require("../services/ai/session.service");
const aiService = require("../services/ai/ai.service");

// ─── Command prefixes to skip ───────────────────────
const COMMAND_PREFIXES = ["/", ".", "!", "#"];

// ─── Escape Markdown special chars ──────────────────
function escapeMarkdown(text) {
    if (!text) return "";
    // Only escape if we are NOT using a code block
    // (this preserves ``` blocks and inline formatting)
    return text;
}

// ─── Split long message into chunks ─────────────────
function splitMessage(text, maxLen = 3900) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > maxLen) {
        let cut = remaining.lastIndexOf("\n", maxLen);
        if (cut === -1 || cut < maxLen * 0.5) cut = maxLen;

        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trim();
    }

    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function aiListener(ctx, next) {
    // ─── Only text messages ─────────────────────────
    if (!ctx.message?.text) return next();
    if (!ctx.from) return next();
    if (ctx.from.is_bot) return next();

    const text = ctx.message.text.trim();
    const userId = String(ctx.from.id);

    // ─── Skip if it is a command ────────────────────
    if (COMMAND_PREFIXES.includes(text[0])) return next();

    // ─── Skip if user has AI OFF ────────────────────
    const isOn = await session.isOn(userId);
    if (!isOn) return next();

    // ─── Group behavior: only when tagged ───────────
    const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";

    if (isGroup) {
        const botUsername = ctx.me?.username;
        const isTagged =
            botUsername &&
            text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
        const isReplyToBot =
            ctx.message.reply_to_message?.from?.id === ctx.me?.id;

        if (!isTagged && !isReplyToBot) return next();

        ctx.aiText = isTagged
            ? text.replace(new RegExp(`@${botUsername}`, "gi"), "").trim()
            : text;
    } else {
        ctx.aiText = text;
    }

    // ═══════════════════════════════════════════════
    //  Route to AI
    // ═══════════════════════════════════════════════
    await handleAIMessage(ctx);
}

// ══════════════════════════════════════════════════
//  Handle AI response
// ══════════════════════════════════════════════════
async function handleAIMessage(ctx) {
    const userId = String(ctx.from.id);
    const prompt = ctx.aiText;

    if (!prompt) return;

    // ─── Send "thinking" indicator ──────────────────
    let thinking;
    try {
        thinking = await ctx.reply("◐ Thinking...");
    } catch {
        return;
    }

    try {
        // ─── Fetch AI reply ─────────────────────────
        const result = await aiService.chat(prompt);

        // ─── Increment usage ────────────────────────
        const used = await session.incrementUsed(userId);
        const remaining = Math.max(0, session.FREE_DAILY_LIMIT - used);

        // ─── Build footer ───────────────────────────
        const footer = remaining > 0
            ? `\n\n▸ Free  ➤  ${remaining} / ${session.FREE_DAILY_LIMIT} today`
            : `\n\n▸ Free  ➤  used up ⏤ /store for coins`;

        // ─── Split if too long ──────────────────────
        const fullText = `◈ ${result.reply}${footer}`;
        const chunks = splitMessage(fullText, 3900);

        // ─── Edit thinking message with first chunk ─
        try {
            await ctx.api.editMessageText(
                ctx.chat.id,
                thinking.message_id,
                chunks[0],
                { parse_mode: "Markdown" }
            );
        } catch {
            // Fallback without Markdown
            await ctx.api
                .editMessageText(ctx.chat.id, thinking.message_id, chunks[0])
                .catch(() => {});
        }

        // ─── Send remaining chunks as new messages ──
        for (let i = 1; i < chunks.length; i++) {
            try {
                await ctx.reply(chunks[i], { parse_mode: "Markdown" });
            } catch {
                await ctx.reply(chunks[i]).catch(() => {});
            }
        }

        logger.info(`[aiListener] ${userId}  ⏤  ${result.provider}`);

    } catch (err) {
        logger.error(`[aiListener] failed: ${err.message}`);

        await ctx.api
            .editMessageText(
                ctx.chat.id,
                thinking.message_id,
                `✗  AI is unavailable right now\n\n▸ Try again in a minute`
            )
            .catch(() => {});
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = aiListener;