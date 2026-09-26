// ──────────────────────────────────────────────────
//  BIGSTACK — AI Listener Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Catches plain messages from users with AI ON.
//  Routes to chat / image gen / voice / vision.
//  Persists every message to MongoDB forever.
// ──────────────────────────────────────────────────

const fs = require("fs");
const { InputFile } = require("grammy");
const logger = require("../core/logger");
const session = require("../services/ai/session.service");
const aiService = require("../services/ai/ai.service");
const imageService = require("../services/ai/image.service");
const visionService = require("../services/ai/vision.service");
const voiceService = require("../services/ai/voice.service");
const musicService = require("../services/ai/music.service");
const memory = require("../services/ai/memory.service");
const uploadService = require("../services/upload/nexray.service");
const { downloadTelegramFile, deleteFile } = require("../utils/fileHelpers");

const COMMAND_PREFIXES = ["/", ".", "!", "#"];

// ─── Split long messages ────────────────────────────
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
    if (remaining.length) chunks.push(remaining);
    return chunks;
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function aiListener(ctx, next) {
    if (!ctx.from || ctx.from.is_bot) return next();

    const userId = String(ctx.from.id);
    const isOn = await session.isOn(userId);
    if (!isOn) return next();

    const msg = ctx.message;
    if (!msg) return next();

    // ─── Detect message type ────────────────────────
    const text = msg.text?.trim() || msg.caption?.trim() || "";
    const isVoice = !!(msg.voice || msg.audio);
    const isPhoto = !!msg.photo;

    // ─── Skip commands ──────────────────────────────
    if (text && COMMAND_PREFIXES.includes(text[0])) return next();

    // ─── Group tagging ──────────────────────────────
    const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
    let userText = text;

    if (isGroup) {
        const botUsername = ctx.me?.username;
        const isTagged = botUsername && text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
        const isReplyToBot = msg.reply_to_message?.from?.id === ctx.me?.id;

        if (!isTagged && !isReplyToBot && !isVoice && !isPhoto) return next();

        if (isTagged) {
            userText = text.replace(new RegExp(`@${botUsername}`, "gi"), "").trim();
        }
    }

    // ═══════════════════════════════════════════════
    //  Route based on type
    // ═══════════════════════════════════════════════

    if (isVoice) return handleVoice(ctx, msg.voice || msg.audio);
    if (isPhoto) return handleImage(ctx, msg.photo, userText);
    if (userText) return handleText(ctx, userText);
}

// ══════════════════════════════════════════════════
//  Handle text ⏤ chat or image gen
// ══════════════════════════════════════════════════
async function handleText(ctx, prompt) {
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);

    // Detect image generation intent
    const imageKeywords = /\b(create|generate|draw|make|paint)\s+(an?\s+)?(image|picture|photo|art|illustration)/i;
    if (imageKeywords.test(prompt)) {
        return handleImageGen(ctx, prompt);
    }

    let thinking;
    try {
        thinking = await ctx.reply("◐ Thinking...");
    } catch { return; }

    try {
        // ─── Load memory ─────────────────────────
        const history = await memory.getRecent(userId, 20);

        // ─── Save user message ───────────────────
        await memory.save(userId, "user", prompt, {
            chatId,
            type: "text"
        });

        // ─── Get AI reply with memory ────────────
        const result = await aiService.chat(prompt, history);

        // ─── Save assistant reply ────────────────
        await memory.save(userId, "assistant", result.reply, {
            chatId,
            type: "text",
            provider: result.provider
        });

        // ─── Track usage ─────────────────────────
        const used = await session.incrementUsed(userId);
        const remaining = Math.max(0, session.FREE_DAILY_LIMIT - used);

        const footer = remaining > 0
            ? `\n\n▸ Free  ➤  ${remaining} / ${session.FREE_DAILY_LIMIT} today`
            : `\n\n▸ Free  ➤  used up ⏤ /store for coins`;

        const chunks = splitMessage(`◈ ${result.reply}${footer}`, 3900);

        try {
            await ctx.api.editMessageText(
                ctx.chat.id,
                thinking.message_id,
                chunks[0],
                { parse_mode: "Markdown" }
            );
        } catch {
            await ctx.api
                .editMessageText(ctx.chat.id, thinking.message_id, chunks[0])
                .catch(() => {});
        }

        for (let i = 1; i < chunks.length; i++) {
            try {
                await ctx.reply(chunks[i], { parse_mode: "Markdown" });
            } catch {
                await ctx.reply(chunks[i]).catch(() => {});
            }
        }

    } catch (err) {
        logger.error(`[aiListener text] ${err.message}`);
        await ctx.api
            .editMessageText(ctx.chat.id, thinking.message_id, "✗  AI unavailable. Try again.")
            .catch(() => {});
    }
}

// ══════════════════════════════════════════════════
//  Handle image generation
// ══════════════════════════════════════════════════
async function handleImageGen(ctx, prompt) {
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);

    let thinking;
    try {
        thinking = await ctx.reply("◐ Generating image...");
    } catch { return; }

    try {
        const cleanPrompt = prompt
            .replace(/^(create|generate|draw|make|paint)\s+(an?\s+)?(image|picture|photo|art|illustration)\s+(of|about)?\s*/i, "")
            .trim();

        const result = await imageService.generate(cleanPrompt || prompt);

        // ─── Save to memory ──────────────────────
        await memory.save(userId, "user", prompt, {
            chatId,
            type: "text"
        });
        await memory.save(userId, "assistant", `[Generated image] ${cleanPrompt}`, {
            chatId,
            type: "image",
            provider: result.provider,
            mediaUrl: result.url
        });

        await ctx.api.deleteMessage(ctx.chat.id, thinking.message_id).catch(() => {});
        await ctx.replyWithPhoto(result.url, {
            caption:
                `◈ *Generated*\n\n` +
                `◉ Prompt ➤ ${cleanPrompt || prompt}\n` +
                `⊛ Provider ➤ ${result.provider}`,
            parse_mode: "Markdown"
        });

    } catch (err) {
        logger.error(`[aiListener image] ${err.message}`);
        await ctx.api
            .editMessageText(ctx.chat.id, thinking.message_id, "✗  Image generation failed.")
            .catch(() => {});
    }
}

// ══════════════════════════════════════════════════
//  Handle voice note (STT + chat)
// ══════════════════════════════════════════════════
async function handleVoice(ctx, voiceObj) {
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);

    let thinking;
    try {
        thinking = await ctx.reply("◐ Listening...");
    } catch { return; }

    let filePath = null;

    try {
        filePath = await downloadTelegramFile(ctx, voiceObj.file_id, "ogg");
        const uploaded = await uploadService.upload(filePath);
        const { text } = await voiceService.speechToText(filePath, "en");

        await ctx.api.editMessageText(
            ctx.chat.id,
            thinking.message_id,
            `◈ *You said:*\n${text}\n\n◐ Thinking...`,
            { parse_mode: "Markdown" }
        );

        // ─── Load memory ─────────────────────────
        const history = await memory.getRecent(userId, 20);

        // ─── Save user voice message ─────────────
        await memory.save(userId, "user", text, {
            chatId,
            type: "voice",
            mediaUrl: uploaded.url
        });

        // ─── Get AI reply ────────────────────────
        const result = await aiService.chat(text, history);

        // ─── Save assistant reply ────────────────
        await memory.save(userId, "assistant", result.reply, {
            chatId,
            type: "text",
            provider: result.provider
        });

        const chunks = splitMessage(`◈ ${result.reply}`, 3900);

        try {
            await ctx.api.editMessageText(
                ctx.chat.id,
                thinking.message_id,
                chunks[0],
                { parse_mode: "Markdown" }
            );
        } catch {
            await ctx.api
                .editMessageText(ctx.chat.id, thinking.message_id, chunks[0])
                .catch(() => {});
        }

        for (let i = 1; i < chunks.length; i++) {
            try {
                await ctx.reply(chunks[i], { parse_mode: "Markdown" });
            } catch {
                await ctx.reply(chunks[i]).catch(() => {});
            }
        }

    } catch (err) {
        logger.error(`[aiListener voice] ${err.message}`);
        await ctx.api
            .editMessageText(ctx.chat.id, thinking.message_id, "✗  Could not process voice.")
            .catch(() => {});
    } finally {
        deleteFile(filePath);
    }
}

// ══════════════════════════════════════════════════
//  Handle photo (vision)
// ══════════════════════════════════════════════════
async function handleImage(ctx, photoArray, userPrompt) {
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);

    let thinking;
    try {
        thinking = await ctx.reply("◐ Analyzing image...");
    } catch { return; }

    let filePath = null;

    try {
        const largest = photoArray[photoArray.length - 1];
        filePath = await downloadTelegramFile(ctx, largest.file_id, "jpg");

        const uploaded = await uploadService.upload(filePath);
        const prompt = userPrompt || "Describe this image in detail.";
        const result = await visionService.describe(uploaded.url, prompt);

        // ─── Save to memory ──────────────────────
        await memory.save(userId, "user", prompt, {
            chatId,
            type: "image",
            mediaUrl: uploaded.url
        });
        await memory.save(userId, "assistant", result.description, {
            chatId,
            type: "text",
            provider: result.provider
        });

        await ctx.api
            .editMessageText(
                ctx.chat.id,
                thinking.message_id,
                `◈ *Image Description*\n\n${result.description}`,
                { parse_mode: "Markdown" }
            )
            .catch(async () => {
                await ctx.api
                    .editMessageText(
                        ctx.chat.id,
                        thinking.message_id,
                        `◈ Image Description\n\n${result.description}`
                    )
                    .catch(() => {});
            });

    } catch (err) {
        logger.error(`[aiListener vision] ${err.message}`);
        await ctx.api
            .editMessageText(ctx.chat.id, thinking.message_id, "✗  Could not analyze image.")
            .catch(() => {});
    } finally {
        deleteFile(filePath);
    }
}

module.exports = aiListener;