// ──────────────────────────────────────────────────
//  BIGSTACK — AI Session Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const cache = require("../../core/cache");
const config = require("../../config");

const FREE_DAILY_LIMIT = config.ai?.freeTier?.dailyMessages || 15;

async function enable(userId) { await cache.set(`ai:on:${userId}`, true, 0); }
async function disable(userId) { await cache.set(`ai:on:${userId}`, false, 0); }
async function isOn(userId) { return (await cache.get(`ai:on:${userId}`)) === true; }

async function getUsedToday(userId) {
    return (await cache.get(`ai:used:${userId}`)) || 0;
}

async function incrementUsed(userId) {
    const used = await getUsedToday(userId);
    await cache.set(`ai:used:${userId}`, used + 1, 86400);
    return used + 1;
}

async function getStatus(userId) {
    const on = await isOn(userId);
    const used = await getUsedToday(userId);
    return {
        enabled: on,
        usedToday: used,
        remaining: Math.max(0, FREE_DAILY_LIMIT - used),
        limit: FREE_DAILY_LIMIT
    };
}

module.exports = {
    enable, disable, isOn,
    getUsedToday, incrementUsed, getStatus,
    FREE_DAILY_LIMIT
};