// ──────────────────────────────────────────────────
//  BIGSTACK — Reward Routes
//  Daily claim, referral
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const jwtAuth = require("../middlewares/jwtAuth");
const User = require("../../src/database/models/User");
const Transaction = require("../../src/database/models/Transaction");
const config = require("../../src/config");
const logger = require("../../src/core/logger");

router.use(jwtAuth);

// ══════════════════════════════════════════════════
//  POST /api/reward/daily
//  Claim daily reward
// ══════════════════════════════════════════════════
router.post("/daily", async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        // ─── Check cooldown ─────────────────────────
        const check = user.canClaimDaily(24 * 60 * 60 * 1000);

        if (!check.ok) {
            return res.status(400).json({
                error: "Already claimed",
                remainingMs: check.remaining
            });
        }

        // ─── Calculate reward ───────────────────────
        const premium = user.premiumActive;
        const base = config.rewards?.daily?.coins || 100;
        const reward = premium ? base * 3 : base;

        // ─── Claim ──────────────────────────────────
        user.claimDaily(reward);
        await user.save();

        await Transaction.log({
            userId: user.telegramId,
            type: "earn",
            amount: reward,
            balanceAfter: user.coins,
            reason: "Daily reward",
            source: "daily"
        });

        logger.info(`[api/reward/daily] ${user.telegramId} claimed ${reward}`);

        res.json({
            ok: true,
            reward,
            newBalance: user.coins,
            streakDays: user.streakDays
        });

    } catch (err) {
        logger.error(`[api/reward/daily] ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════
//  GET /api/reward/status
// ══════════════════════════════════════════════════
router.get("/status", async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        const check = user.canClaimDaily(24 * 60 * 60 * 1000);

        res.json({
            ok: true,
            canClaim: check.ok,
            remainingMs: check.remaining,
            streakDays: user.streakDays || 0,
            totalClaims: user.totalClaims || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;