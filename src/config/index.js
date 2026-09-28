// ──────────────────────────────────────────────────
//  BIGSTACK — Config Master
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

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
const sonicpesa = require("./sonicpesa");
const payments = require("./payments");
const api = require("./api");

// ─── Master config ──────────────────────────────────
const config = {
    // ─── Raw modules ────────────────────────────────
    env,
    constants,
    providers,
    searchProviders,
    aiProviders,
    aiSystemPrompt,
    prefixes,
    siteMap,
    permissions,
    forceJoin,
    reward,
    webApp,
    sonicpesa,
    payments,
    api,

    // ─── Branding ───────────────────────────────────
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

    // ─── Shortcuts ──────────────────────────────────
    ownerId: env.ownerId,
    ownerUsername: branding.owner.username,
    botToken: env.botToken,
    botUsername: branding.bot.username,
    prefix: prefixes.default,

    // ─── Helpers ────────────────────────────────────
    isEnabled(feature) {
        return branding.features?.[feature] === true;
    },

    getCoinCost(commandName) {
        return (
            branding.coins?.perCommand?.[commandName] ??
            permissions.COIN_COSTS?.[commandName] ??
            0
        );
    },

    getProviders(commandName) {
        const list = providers[commandName] || [];
        return list.filter((p) => p.enabled !== false);
    },

    getSearchProviders(commandName) {
        const list = searchProviders[commandName] || [];
        return list.filter((p) => p.enabled !== false);
    },

    getAIProviders() {
        return (aiProviders.chat || []).filter((p) => p.enabled !== false);
    },

    getSystemPrompt() {
        return aiSystemPrompt.SYSTEM_PROMPT;
    },

    detectSite(url) {
        return siteMap.detect(url);
    },

    isSupported(url) {
        return siteMap.isSupported(url);
    },

    isOwner(userId) {
        return String(userId) === String(env.ownerId);
    },

    canRun(user, command) {
        return permissions.canRun(user, command);
    },

    dailyStatus(lastClaimAt) {
        return reward.canClaimDaily(lastClaimAt);
    },

    needsForceJoin() {
        return forceJoin.isEnabled();
    },

    hasMiniApp() {
        return webApp.isEnabled();
    }
};

module.exports = config;