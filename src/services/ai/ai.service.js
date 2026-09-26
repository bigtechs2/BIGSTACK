// ──────────────────────────────────────────────────
//  BIGSTACK — AI Chat Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");
const { SYSTEM_PROMPT } = require("../../config/aiSystemPrompt");

let preferredProvider = null;
let preferredExpiry = 0;

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
//  Prompt builder
// ══════════════════════════════════════════════════

function buildPrompt(prompt, history = []) {
    const parts = [SYSTEM_PROMPT, "", "══════════════════════", ""];

    if (Array.isArray(history) && history.length > 0) {
        parts.push("## Conversation so far", "");
        for (const msg of history.slice(-10)) {
            const role = msg.role === "assistant" ? "BIGSTACK AI" : "User";
            parts.push(`${role}: ${msg.content}`);
        }
        parts.push("");
    }

    parts.push("## New message");
    parts.push(`User: ${prompt}`);
    parts.push("");
    parts.push("BIGSTACK AI:");

    return parts.join("\n");
}

// ══════════════════════════════════════════════════
//  Main chat
// ══════════════════════════════════════════════════

async function chat(prompt, history = []) {
    if (!prompt || typeof prompt !== "string") throw new Error("Prompt is required");

    const fullPrompt = buildPrompt(prompt, history);
    const providers = config.aiProviders?.chat || [];

    // Prefer the last working provider
    const ordered = preferredProvider && Date.now() < preferredExpiry
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

            const reply = normalize(provider.shape, data);

            if (!reply || reply.length < 2) throw new Error("Empty response");

            preferredProvider = provider.name;
            preferredExpiry = Date.now() + 5 * 60 * 1000;

            logger.info(`[ai] ✓ ${provider.name} (${reply.length} chars)`);

            return { reply: reply.trim(), provider: provider.name, tier: provider.tier || 1 };

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