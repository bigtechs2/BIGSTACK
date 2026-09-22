// ──────────────────────────────────────────────────
//  BIGSTACK — AI Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Tries every provider in order ⏤ first success wins.
//  Caches the working provider for 5 minutes.
//  Prepends system prompt + memory to every request.
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const { SYSTEM_PROMPT } = require("../../config/aiSystemPrompt");

// ─── Cache winning provider for 5 min ───────────────
let preferredProvider = null;
let preferredExpiry = 0;

// ══════════════════════════════════════════════════
//  Normalizers ⏤ one per API shape
// ══════════════════════════════════════════════════

function normalizeZellrayy(data) {
    if (!data?.status || !data?.result) return null;
    return typeof data.result === "string" ? data.result : null;
}

function normalizeNexray(data) {
    if (!data?.status || !data?.result) return null;
    return typeof data.result === "string" ? data.result : null;
}

function normalizeAzbry(data) {
    if (!data?.status) return null;
    const r = data.result;
    if (!r) return null;
    return r.response || r.text || r.answer || (typeof r === "string" ? r : null);
}

// ══════════════════════════════════════════════════
//  Prompt builder ⏤ system + history + current
// ══════════════════════════════════════════════════

function buildPrompt(prompt, history = []) {
    const parts = [
        SYSTEM_PROMPT,
        "",
        "═══════════════════════════════",
        ""
    ];

    // ─── Add memory ─────────────────────────────────
    if (Array.isArray(history) && history.length > 0) {
        parts.push("## Conversation so far");
        parts.push("");

        for (const msg of history.slice(-10)) {
            const role = msg.role === "assistant" ? "BIGSTACK AI" : "User";
            parts.push(`${role}: ${msg.content}`);
        }

        parts.push("");
    }

    // ─── Add current message ────────────────────────
    parts.push("## New message");
    parts.push(`User: ${prompt}`);
    parts.push("");
    parts.push("BIGSTACK AI:");

    return parts.join("\n");
}

// ══════════════════════════════════════════════════
//  Main chat function
// ══════════════════════════════════════════════════

/**
 * Send a message to the AI.
 * @param {string} prompt  ⏤ user's question
 * @param {Array}  history ⏤ [{ role: "user"|"assistant", content: "..." }]
 * @returns {Promise<{ reply, provider, tier }>}
 */
async function chat(prompt, history = []) {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("Prompt is required");
    }

    const fullPrompt = buildPrompt(prompt, history);
    const providers = config.aiProviders?.chat || [];

    logger.info(`[ai] trying ${providers.length} provider(s)`);

    // ─── Try preferred provider first ───────────────
    const ordered = preferredProvider
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
                timeout: provider.timeout || 30000
            });

            let reply = null;
            if (provider.shape === "zellrayy") reply = normalizeZellrayy(data);
            if (provider.shape === "nexray")   reply = normalizeNexray(data);
            if (provider.shape === "azbry")    reply = normalizeAzbry(data);

            if (!reply || reply.length < 2) {
                throw new Error("Empty or invalid response");
            }

            // ─── Remember winning provider ───────────
            preferredProvider = provider.name;
            preferredExpiry = Date.now() + 5 * 60 * 1000;

            logger.info(`[ai] ✓ ${provider.name} replied (${reply.length} chars)`);

            return {
                reply: reply.trim(),
                provider: provider.name,
                tier: provider.tier || 1
            };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[ai] ✗ ${provider.name}: ${msg}`);
            lastError = err;
            continue;
        }
    }

    // ─── All failed ═ reset preferred so next time we retry from top ───
    preferredProvider = null;
    preferredExpiry = 0;

    throw lastError || new Error("All AI providers failed");
}

// ══════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════

function resetPreferred() {
    preferredProvider = null;
    preferredExpiry = 0;
}

function getStatus() {
    if (!preferredProvider || Date.now() > preferredExpiry) {
        return { provider: null, active: false };
    }
    return { provider: preferredProvider, active: true };
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    chat,
    resetPreferred,
    getStatus
};