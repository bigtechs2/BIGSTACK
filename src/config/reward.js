// ──────────────────────────────────────────────────
//  BIGSTACK — Reward Helper
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

// ─── Get raw config ─────────────────────────────────
const raw = branding.rewards || {
    daily: { enabled: false, coins: 0, premiumCoins: 0, cooldownHours: 24 },
    referral: { enabled: false, referrerBonus: 0, refereeBonus: 0 },
    start: { enabled: false, coins: 0 }
};

// ─── DAILY REWARD ───────────────────────────────────

function isDailyEnabled() {
    return raw.daily?.enabled === true;
}

function getDailyCoins(isPremium = false) {
    if (!isDailyEnabled()) return 0;
    return isPremium
        ? raw.daily.premiumCoins ?? raw.daily.coins
        : raw.daily.coins;
}

function getDailyCooldownMs() {
    const hours = raw.daily?.cooldownHours ?? 24;
    return hours * 60 * 60 * 1000;
}

function getDailyCooldownHours() {
    return raw.daily?.cooldownHours ?? 24;
}

/**
 * Can this user claim the daily reward right now?
 * @param {number} lastClaimAt - timestamp (ms) of last claim
 * @returns {{ canClaim: boolean, remainingMs: number, remainingText: string }}
 */
function canClaimDaily(lastClaimAt) {
    if (!lastClaimAt) {
        return { canClaim: true, remainingMs: 0, remainingText: "Ready now" };
    }

    const cooldown = getDailyCooldownMs();
    const elapsed = Date.now() - lastClaimAt;
    const remaining = cooldown - elapsed;

    if (remaining <= 0) {
        return { canClaim: true, remainingMs: 0, remainingText: "Ready now" };
    }

    return {
        canClaim: false,
        remainingMs: remaining,
        remainingText: formatDuration(remaining)
    };
}

// ─── REFERRAL REWARD ────────────────────────────────

function isReferralEnabled() {
    return raw.referral?.enabled === true;
}

function getReferrerBonus() {
    if (!isReferralEnabled()) return 0;
    return raw.referral.referrerBonus ?? 0;
}

function getRefereeBonus() {
    if (!isReferralEnabled()) return 0;
    return raw.referral.refereeBonus ?? 0;
}

// ─── START BONUS ────────────────────────────────────

function isStartBonusEnabled() {
    return raw.start?.enabled === true;
}

function getStartBonus() {
    if (!isStartBonusEnabled()) return 0;
    return raw.start.coins ?? 0;
}

// ─── BUILDERS ───────────────────────────────────────

/**
 * Build the "daily claimed" success message
 */
function buildDailySuccessMessage(coins, newBalance, isPremium, footer) {
    const lines = [
        "🪙 *Daily Reward Claimed!*",
        "",
        `+${coins} Coins added to your balance.`,
        "",
        `💰 New Balance: *${newBalance}* Coins`,
        `⏰ Next claim in: *${getDailyCooldownHours()} hours*`
    ];

    if (isPremium) {
        lines.push("");
        lines.push("💎 *Premium bonus applied!*");
    } else {
        lines.push("");
        lines.push("💡 _Tip: Upgrade to Premium for more coins!_");
    }

    lines.push("");
    lines.push(footer);

    return lines.join("\n");
}

/**
 * Build the "already claimed" message
 */
function buildAlreadyClaimedMessage(remainingText, footer) {
    return [
        "⏳ *Already Claimed!*",
        "",
        `You can claim your next reward in *${remainingText}*.`,
        "",
        "💡 _Tip: Upgrade to Premium for bigger daily rewards!_",
        "",
        footer
    ].join("\n");
}

/**
 * Build the "daily disabled" message
 */
function buildDailyDisabledMessage(footer) {
    return [
        "🚫 *Daily Rewards Disabled*",
        "",
        "The daily reward system is currently turned off.",
        "",
        footer
    ].join("\n");
}

// ─── TIME FORMATTER ─────────────────────────────────
// Converts ms → "4h 12m" style text
function formatDuration(ms) {
    if (ms <= 0) return "Ready now";

    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);

    return parts.join(" ") || "less than a minute";
}

// ─── EXPORT ─────────────────────────────────────────
module.exports = {
    // Raw config
    raw,

    // Daily
    isDailyEnabled,
    getDailyCoins,
    getDailyCooldownMs,
    getDailyCooldownHours,
    canClaimDaily,

    // Referral
    isReferralEnabled,
    getReferrerBonus,
    getRefereeBonus,

    // Start
    isStartBonusEnabled,
    getStartBonus,

    // Builders
    buildDailySuccessMessage,
    buildAlreadyClaimedMessage,
    buildDailyDisabledMessage,

    // Utils
    formatDuration
};