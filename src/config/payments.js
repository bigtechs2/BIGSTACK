// ──────────────────────────────────────────────────
//  BIGSTACK — Payments Config
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

const raw = branding.payments || {
    enabled: false,
    starsEnabled: false,
    manualEnabled: false,
    cryptoEnabled: false,
    packages: {},
    premiumPlans: {}
};

module.exports = {
    enabled: raw.enabled === true,
    starsEnabled: raw.starsEnabled === true,
    manualEnabled: raw.manualEnabled === true,
    cryptoEnabled: raw.cryptoEnabled === true,
    minTsh: raw.minTsh || 500,
    maxTsh: raw.maxTsh || 3500,
    maxStarsPerTransaction: raw.maxStarsPerTransaction || 100,
    mpesa: raw.mpesa || null,
    tigopesa: raw.tigopesa || null,
    airtel: raw.airtel || null,
    halopesa: raw.halopesa || null,
    usdtTrc20: raw.usdtTrc20 || null,
    usdtBep20: raw.usdtBep20 || null,
    tonWallet: raw.tonWallet || null,
    packages: raw.packages || {},
    premiumPlans: raw.premiumPlans || {}
};