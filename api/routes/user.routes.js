// ──────────────────────────────────────────────────
//  BIGSTACK — User Routes
//  Profile, balance, transactions
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const jwtAuth = require("../middlewares/jwtAuth");
const User = require("../../src/database/models/User");
const Transaction = require("../../src/database/models/Transaction");

// ─── All routes require auth ────────────────────────
router.use(jwtAuth);

// ══════════════════════════════════════════════════
//  GET /api/user/me
// ══════════════════════════════════════════════════
router.get("/me", async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            ok: true,
            user: {
                id: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                coins: user.coins,
                totalEarned: user.totalEarned,
                totalSpent: user.totalSpent,
                premium: user.premiumActive || false,
                premiumExpiry: user.premiumExpiry,
                streakDays: user.streakDays || 0,
                totalCommands: user.totalCommands || 0,
                totalDownloads: user.totalDownloads || 0,
                referralCode: user.referralCode,
                referralCount: user.referralCount || 0,
                language: user.language,
                settings: user.settings
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════
//  GET /api/user/transactions
// ══════════════════════════════════════════════════
router.get("/transactions", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const list = await Transaction.getRecentForUser(req.userId, limit);

        res.json({ ok: true, transactions: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ══════════════════════════════════════════════════
//  GET /api/user/stats
// ══════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
    try {
        const stats = await Transaction.getStats(req.userId);
        res.json({ ok: true, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;