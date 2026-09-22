// ──────────────────────────────────────────────────
//  BIGSTACK — AI Session Service
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Tracks ON/OFF per user + free tier counter.
// ──────────────────────────────────────────────────

const cache = require("../../core/cache");
const config = require("../../config");

// ─── Free tier limit ────────────────────────────────
const FREE_DAILY_LIMIT = config.ai?.freeTier?.dailyMessages || 15;

// ─── Enable ─────────────────────────────────────────
async function enable(userId) {
    await cache.set(`ai:on:${userId}`, true, 0);
}

// ─── Disable ────────────────────────────────────────
async function disable(userId) {
    await cache.set(`ai:on:${userId}`, false, 0);
}

// ─── Is ON ──────────────────────────────────────────
async function isOn(userId) {
    return (await cache.get(`ai:on:${userId}`)) === true;
}

// ─── Messages used today ────────────────────────────
async function getUsedToday(userId) {
    return (await cache.get(`ai:used:${userId}`)) || 0;
}

// ─── Increment ──────────────────────────────────────
async function incrementUsed(userId) {
    const used = await getUsedToday(userId);
    await cache.set(`ai:used:${userId}`, used + 1, 86400);
    return used + 1;
}

// ─── Reset ──────────────────────────────────────────
async function resetUsed(userId) {
    await cache.set(`ai:used:${userId}`, 0, 86400);
}

// ─── Has free messages left? ────────────────────────
async function hasFreeMessages(userId) {
    const used = await getUsedToday(userId);
    return used < FREE_DAILY_LIMIT;
}

// ─── Get status ─────────────────────────────────────
async function getStatus(userId) {
    const on = await isOn(userId);
    const used = await getUsedToday(userId);
    const remaining = Math.max(0, FREE_DAILY_LIMIT - used);

    return {
        enabled: on,
        usedToday: used,
        remaining,
        limit: FREE_DAILY_LIMIT
    };
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    enable,
    disable,
    isOn,
    getUsedToday,
    incrementUsed,
    resetUsed,
    hasFreeMessages,
    getStatus,
    FREE_DAILY_LIMIT
};