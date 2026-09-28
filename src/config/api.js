// ──────────────────────────────────────────────────
//  BIGSTACK — API Config
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

const raw = branding.api || {
    enabled: true,
    port: 3000,
    baseUrl: "http://localhost:3000"
};

module.exports = {
    enabled: raw.enabled !== false,
    port: raw.port || 3000,
    baseUrl: raw.baseUrl || "http://localhost:3000"
};