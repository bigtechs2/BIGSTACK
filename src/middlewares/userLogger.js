// ──────────────────────────────────────────────────
//  BIGSTACK — User Logger Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Registers every user in the database.
//  Generates a referral code on first registration.
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const User = require("../database/models/User");

// ─── Track registered users in memory (avoid DB hit every message) ───
const registeredUsers = new Set();

// ─── Build referral code ────────────────────────────
function buildReferralCode(telegramId) {
    const idPart = String(telegramId).slice(-10);
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BS${idPart}${rand}`;
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function userLogger(ctx, next) {
    // ─── Skip if no user ────────────────────────────
    if (!ctx.from || ctx.from.is_bot) return next();

    const userId = String(ctx.from.id);

    // ─── Already registered this session? ───────────
    if (registeredUsers.has(userId)) {
        return next();
    }

    try {
        let user = await User.findOne({ telegramId: userId });

        if (!user) {
            // ─── Create new user ───────────────────
            user = await User.create({
                telegramId: userId,
                username: ctx.from.username || null,
                firstName: ctx.from.first_name || null,
                lastName: ctx.from.last_name || null,
                language: ctx.from.language_code || "en",
                referralCode: buildReferralCode(userId)
            });

            logger.info(`[userLogger] new user: ${userId} (@${ctx.from.username || "no-username"})`);
        } else {
            // ─── Update last seen ──────────────────
            user.lastSeen = new Date();
            if (ctx.from.username) user.username = ctx.from.username;

            // ─── Backfill referral code if missing ─
            if (!user.referralCode) {
                user.referralCode = buildReferralCode(userId);
            }

            await user.save().catch(() => {});
        }

        // ─── Attach user to context ────────────────
        ctx.user = user;

        // ─── Mark as registered ────────────────────
        registeredUsers.add(userId);

    } catch (err) {
        // ─── Duplicate key (should not happen now) ─
        if (err.code === 11000) {
            logger.warn(`[userLogger] duplicate for ${userId}, retrying fetch`);
            ctx.user = await User.findOne({ telegramId: userId }).catch(() => null);
        } else {
            logger.warn(`[userLogger] registration failed: ${err.message}`);
        }
    }

    return next();
}

// ─── Cleanup ────────────────────────────────────────
function cleanup() {
    registeredUsers.clear();
}

// ─── Export ─────────────────────────────────────────
module.exports = userLogger;
module.exports.cleanup = cleanup;