// ──────────────────────────────────────────────────
//  BIGSTACK — SonicPesa Config
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

const raw = branding.sonicpesa || {
    enabled: false,
    env: "sandbox",
    apiUrl: "https://api.sonicpesa.com/api/v1/payment/create_order",
    currency: "TZS",
    timeoutMs: 45000
};

module.exports = {
    enabled: raw.enabled === true,
    env: raw.env || "sandbox",
    apiUrl: raw.apiUrl,
    currency: raw.currency || "TZS",
    timeoutMs: raw.timeoutMs || 45000,
    webhookPath: raw.webhookPath || "/api/payment/webhook"
};