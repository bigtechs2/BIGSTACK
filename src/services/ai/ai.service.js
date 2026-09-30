// ──────────────────────────────────────────────────
//  BIGSTACK — AI Chat Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  FIXED:
//  - Format doesn't trigger "message cut off" bug
//  - Filters 15+ refusal patterns
//  - Auto-falls back to next provider
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const { SYSTEM_PROMPT } = require("../../config/aiSystemPrompt");

let preferredProvider = null;
let preferredExpiry = 0;
const PREFERRED_TTL = 5 * 60 * 1000;

// ══════════════════════════════════════════════════
//  Normalizers
// ══════════════════════════════════════════════════

function normalizeDavidcyril(data) {
    if (!data?.success) return null;
    return data.data || null;
}

function normalizeZellrayy(data) {
    if (!data?.status || !data?.result) return null;
    return typeof data.result === "string" ? data.result : null;
}

function normalizeNexray(data) {
    if (!data?.status || !data?.result) return null;
    return typeof data.result === "string" ? data.result : null;
}

function normalize(shape, data) {
    if (shape === "davidcyril") return normalizeDavidcyril(data);
    if (shape === "zellrayy")   return normalizeZellrayy(data);
    if (shape === "nexray")     return normalizeNexray(data);
    return null;
}

// ══════════════════════════════════════════════════
//  Prompt Builder ⏤ ULTRA SAFE
//  Uses quotes + explicit "answer now" instruction
// ══════════════════════════════════════════════════

function buildPrompt(userMessage, history = []) {
    const clean = String(userMessage || "").trim();

    if (!clean) {
        return `${SYSTEM_PROMPT}\n\nUser sent empty message. Reply with a greeting.`;
    }

    // ═══════════════════════════════════════════════
    //  NO HISTORY
    // ═══════════════════════════════════════════════
    if (!Array.isArray(history) || history.length === 0) {
        return (
            `${SYSTEM_PROMPT}\n\n` +
            `════════════════════════════════════\n` +
            `USER MESSAGE (complete, do not ask for more):\n` +
            `"${clean}"\n` +
            `════════════════════════════════════\n\n` +
            `Reply now as BIGSTACK AI. Answer the question above directly.`
        );
    }

    // ═══════════════════════════════════════════════
    //  WITH HISTORY
    // ═══════════════════════════════════════════════
    const recent = history.slice(-4);

    const contextLines = recent
        .map((m) => {
            const speaker = m.role === "assistant" ? "You" : "User";
            const text = String(m.content || "").slice(0, 150);
            return `${speaker} said: "${text}"`;
        })
        .join("\n");

    return (
        `${SYSTEM_PROMPT}\n\n` +
        `Previous conversation:\n` +
        `${contextLines}\n\n` +
        `════════════════════════════════════\n` +
        `NEW USER MESSAGE (complete, do not ask for more):\n` +
        `"${clean}"\n` +
        `════════════════════════════════════\n\n` +
        `Reply now as BIGSTACK AI. Answer the NEW MESSAGE above directly.`
    );
}

// ══════════════════════════════════════════════════
//  Cleanup ⏤ Extended Filters
// ══════════════════════════════════════════════════

// ─── Bad patterns to reject ─────────────────────────
const BAD_PATTERNS = [
    // "Message cut off" family
    "message got cut off",
    "message cut off",
    "message is incomplete",
    "message seems incomplete",
    "please complete your question",
    "please complete your message",
    "please continue your message",
    "could you please continue",
    "could you please complete",
    "could you finish",
    "please finish your question",
    "finish your message",
    "finish your question",
    "your message was cut off",
    "your message seems to be cut off",
    "you started to ask",
    "started to ask a question",
    "it seems like you started",
    "it seems like your message",
    "i think you were about to",
    "i'm not sure what you're trying to say",
    "i'm not sure what you mean",
    "i'm not sure what you are trying",

    // Refusal family
    "i am a large language model",
    "i'm a large language model",
    "i am an ai language model",
    "i'm an ai language model",
    "as an ai language model",
    "as a large language model",
    "i cannot fulfill your request",
    "i can't fulfill your request",
    "i cannot help with that",
    "i'm unable to help",
    "i am unable to help"
];

function isBadReply(text) {
    if (!text || typeof text !== "string") return true;

    const lower = text.toLowerCase().trim();

    // Too short
    if (lower.length < 2) return true;

    // Check each bad pattern
    for (const pattern of BAD_PATTERNS) {
        if (lower.includes(pattern)) return true;
    }

    return false;
}

function cleanupReply(raw) {
    if (!raw || typeof raw !== "string") return null;

    let clean = raw.trim();

    // ─── Remove role prefixes ────────────────────────
    clean = clean.replace(/^(BIGSTACK AI|Assistant|AI)\s*:\s*/i, "");

    // ─── Remove common wrappers ──────────────────────
    clean = clean.replace(/^(Sure[!.,]?\s+)/i, "");
    clean = clean.replace(/^(Of course[!.,]?\s+)/i, "");
    clean = clean.replace(/^(Certainly[!.,]?\s+)/i, "");
    clean = clean.replace(/^(Absolutely[!.,]?\s+)/i, "");

    // ─── Reject bad replies ──────────────────────────
    if (isBadReply(clean)) return null;

    return clean;
}

// ══════════════════════════════════════════════════
//  Main Chat
// ══════════════════════════════════════════════════

async function chat(userMessage, history = []) {
    if (!userMessage || typeof userMessage !== "string") {
        throw new Error("Message is required");
    }

    const fullPrompt = buildPrompt(userMessage, history);
    const providers = config.aiProviders?.chat || [];

    logger.info(`[ai] prompt: ${fullPrompt.length} chars ⏤ ${providers.length} providers`);

    const ordered =
        preferredProvider && Date.now() < preferredExpiry
            ? [
                  providers.find((p) => p.name === preferredProvider),
                  ...providers.filter((p) => p.name !== preferredProvider)
              ].filter(Boolean)
            : providers;

    let lastError = null;

    for (const provider of ordered) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[ai] trying ${provider.name}...`);

            const params = { [provider.param]: fullPrompt };
            if (provider.extraParams) Object.assign(params, provider.extraParams);

            const { data } = await axios.get(provider.url, {
                params,
                headers: provider.headers || {},
                timeout: provider.timeout || 30000
            });

            const rawReply = normalize(provider.shape, data);
            const clean = cleanupReply(rawReply);

            if (!clean) {
                logger.warn(`[ai] ✗ ${provider.name}: bad reply detected`);
                throw new Error("Bad or empty response");
            }

            preferredProvider = provider.name;
            preferredExpiry = Date.now() + PREFERRED_TTL;

            logger.info(`[ai] ✓ ${provider.name} replied (${clean.length} chars)`);

            return {
                reply: clean,
                provider: provider.name,
                tier: provider.tier || 1
            };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[ai] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    preferredProvider = null;
    preferredExpiry = 0;
    throw lastError || new Error("All AI providers failed");
}

function resetPreferred() {
    preferredProvider = null;
    preferredExpiry = 0;
}

module.exports = { chat, resetPreferred };