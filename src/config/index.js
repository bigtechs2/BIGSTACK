// ──────────────────────────────────────────────────
//  BIGSTACK — Config Master
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Merges:
//    • env.js              ⏤ secrets from .env
//    • branding.js         ⏤ branding + features
//    • constants.js        ⏤ fixed values
//    • providers.js        ⏤ downloader providers
//    • searchProviders.js  ⏤ search providers
//    • aiProviders.js      ⏤ AI providers
//    • aiSystemPrompt.js   ⏤ AI identity prompt
//    • prefixes.js         ⏤ command prefixes
//    • siteMap.js          ⏤ URL ⏤ platform detector
//    • permissions.js      ⏤ access control
//    • forceJoin.js        ⏤ force-join channels
//    • reward.js           ⏤ daily/referral rewards
//    • webApp.js           ⏤ Mini App config
// ──────────────────────────────────────────────────

// ─── Load all modules ───────────────────────────────
const aiProviders = require("./aiProviders");
const aiSystemPrompt = require("./aiSystemPrompt");
const env = require("./env");
const branding = require("./branding");
const constants = require("./constants");
const providers = require("./providers");
const searchProviders = require("./searchProviders");
const aiProviders = require("./aiProviders");
const aiSystemPrompt = require("./aiSystemPrompt");
const prefixes = require("./prefixes");
const siteMap = require("./siteMap");
const permissions = require("./permissions");
const forceJoin = require("./forceJoin");
const reward = require("./reward");
const webApp = require("./webApp");

// ─── Master config ──────────────────────────────────
const config = {
    // ─── Raw modules ────────────────────────────────
    env,
    constants,
    providers,           // downloader
    searchProviders,     // search
    aiProviders,         // AI
    aiSystemPrompt,      // AI identity
    prefixes,
    siteMap,
    permissions,
    forceJoin,
    reward,
    webApp,

    // ─── Branding (top level) ───────────────────────
    branding: branding.branding,
    owner: branding.owner,
    bot: branding.bot,
    webapp: branding.webapp,
    features: branding.features,
    rewards: branding.rewards,
    coins: branding.coins,
    premium: branding.premium,
    limits: branding.limits,
    queue: branding.queue,
    cache: branding.cache,
    database: branding.database,
    logging: branding.logging,
    messages: branding.messages,
    links: branding.links,
    locales: branding.locales,
    theme: branding.theme,
    ai: branding.ai,

    // ─── Quick flags ────────────────────────────────
    isDev: env.isDev,
    isProd: env.isProd,
    version: branding.branding.version,
    footer: branding.branding.footer,
    name: branding.branding.name,
    tagline: branding.branding.tagline,

    // ─── Owner shortcuts ────────────────────────────
    ownerId: env.ownerId,
    ownerUsername: branding.owner.username,

    // ─── Bot shortcuts ──────────────────────────────
    botToken: env.botToken,
    botUsername: branding.bot.username,
    prefix: prefixes.default,

    // ══════════════════════════════════════════════
    //  HELPER FUNCTIONS
    // ══════════════════════════════════════════════

    // ─── Is feature enabled? ────────────────────────
    isEnabled(feature) {
        return branding.features?.[feature] === true;
    },

    // ─── Coin cost of a command ─────────────────────
    getCoinCost(commandName) {
        return (
            branding.coins?.perCommand?.[commandName] ??
            permissions.COIN_COSTS?.[commandName] ??
            0
        );
    },

    // ─── Downloader providers ───────────────────────
    getProviders(commandName) {
        const list = providers[commandName] || [];
        return list.filter((p) => p.enabled !== false);
    },

    // ─── Search providers ───────────────────────────
    getSearchProviders(commandName) {
        const list = searchProviders[commandName] || [];
        return list.filter((p) => p.enabled !== false);
    },

    // ─── AI providers ───────────────────────────────
    getAIProviders() {
        return (aiProviders.chat || []).filter((p) => p.enabled !== false);
    },

    // ─── AI system prompt ───────────────────────────
    getSystemPrompt() {
        return aiSystemPrompt.SYSTEM_PROMPT;
    },

    // ─── Detect platform from URL ───────────────────
    detectSite(url) {
        return siteMap.detect(url);
    },

    // ─── Check if URL is supported ──────────────────
    isSupported(url) {
        return siteMap.isSupported(url);
    },

    // ─── Is user the owner? ─────────────────────────
    isOwner(userId) {
        return String(userId) === String(env.ownerId);
    },

    // ─── Can user run a command? ────────────────────
    canRun(user, command) {
        return permissions.canRun(user, command);
    },

    // ─── Daily reward status ────────────────────────
    dailyStatus(lastClaimAt) {
        return reward.canClaimDaily(lastClaimAt);
    },

    // ─── Force-join status ──────────────────────────
    needsForceJoin() {
        return forceJoin.isEnabled();
    },

    // ─── Mini App status ────────────────────────────
    hasMiniApp() {
        return webApp.isEnabled();
    }
};

// ─── Export ─────────────────────────────────────────
module.exports = config;