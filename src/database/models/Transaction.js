// ──────────────────────────────────────────────────
//  BIGSTACK — Transaction Model
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Logs every coin movement: earn, spend, buy, refund.
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        // ─── Who ─────────────────────────────────
        userId: {
            type: String,
            required: true,
            index: true
        },

        // ─── What ────────────────────────────────
        type: {
            type: String,
            enum: [
                "earn",       // daily, quiz, streak, referral
                "spend",      // command cost
                "buy",        // coins purchased
                "premium",    // premium purchase
                "gift_in",    // received a gift
                "gift_out",   // sent a gift
                "refund",     // admin refund
                "admin"       // manual admin adjustment
            ],
            required: true,
            index: true
        },

        amount: {
            type: Number,
            required: true
        },

        balanceAfter: {
            type: Number,
            default: 0
        },

        // ─── Reason / details ────────────────────
        reason: {
            type: String,
            default: null
        },

        source: {
            type: String,
            default: null  // "daily", "quiz", "play", "stars", "mpesa", etc.
        },

        // ─── Payment info (for buy/premium) ──────
        payment: {
            method: {
                type: String,
                enum: ["stars", "mpesa", "crypto", "free", null],
                default: null
            },
            reference: { type: String, default: null },
            amountPaid: { type: String, default: null }  // "100 ⭐", "5000 TSh"
        },

        // ─── Related user (for gifts) ────────────
        relatedUserId: {
            type: String,
            default: null
        },

        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        collection: "transactions",
        timestamps: false,
        versionKey: false
    }
);

transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ type: 1, timestamp: -1 });

// ─── Static: log ────────────────────────────────────
transactionSchema.statics.log = async function ({
    userId,
    type,
    amount,
    balanceAfter = 0,
    reason = null,
    source = null,
    payment = null,
    relatedUserId = null
}) {
    try {
        return this.create({
            userId: String(userId),
            type,
            amount,
            balanceAfter,
            reason,
            source,
            payment,
            relatedUserId
        });
    } catch {
        return null;
    }
};

// ─── Static: get recent for user ────────────────────
transactionSchema.statics.getRecentForUser = async function (userId, limit = 10) {
    return this.find({ userId: String(userId) })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
};

// ─── Static: totals ─────────────────────────────────
transactionSchema.statics.getStats = async function (userId) {
    const agg = await this.aggregate([
        { $match: { userId: String(userId) } },
        {
            $group: {
                _id: "$type",
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = {
        earned: 0,
        spent: 0,
        bought: 0,
        gifted: 0
    };

    for (const row of agg) {
        if (row._id === "earn") stats.earned = row.total;
        if (row._id === "spend") stats.spent = Math.abs(row.total);
        if (row._id === "buy") stats.bought = row.total;
        if (row._id === "gift_in" || row._id === "gift_out") stats.gifted += Math.abs(row.total);
    }

    return stats;
};

module.exports = mongoose.model("Transaction", transactionSchema);