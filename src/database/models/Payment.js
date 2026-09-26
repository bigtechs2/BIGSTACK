// ──────────────────────────────────────────────────
//  BIGSTACK — Payment Model
//  Manual payments waiting for admin approval
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        // ─── User ────────────────────────────────
        userId: {
            type: String,
            required: true,
            index: true
        },
        username: {
            type: String,
            default: null
        },
        firstName: {
            type: String,
            default: null
        },

        // ─── What they're buying ─────────────────
        itemType: {
            type: String,
            enum: ["coins", "premium"],
            required: true
        },
        itemId: {
            type: String,
            required: true  // "coins_100", "premium_monthly"
        },
        itemLabel: {
            type: String,
            required: true  // "100 Coins"
        },
        coinsAmount: {
            type: Number,
            default: 0
        },
        premiumDays: {
            type: Number,
            default: 0
        },

        // ─── Payment details ─────────────────────
        method: {
            type: String,
            enum: ["mpesa", "tigopesa", "airtel", "halopesa", "crypto", "stars"],
            required: true
        },
        amountPaid: {
            type: String,
            required: true  // "5000 TSh"
        },
        reference: {
            type: String,
            default: null  // transaction reference / hash
        },
        screenshot: {
            type: String,
            default: null  // file_id of screenshot
        },
        notes: {
            type: String,
            default: null
        },

        // ─── Status ──────────────────────────────
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "expired"],
            default: "pending",
            index: true
        },

        // ─── Admin action ────────────────────────
        reviewedBy: {
            type: String,
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        rejectReason: {
            type: String,
            default: null
        },

        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24h
        }
    },
    {
        collection: "payments",
        timestamps: false,
        versionKey: false
    }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });

// ─── Get pending payments ───────────────────────────
paymentSchema.statics.getPending = async function () {
    return this.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .lean();
};

// ─── Count pending ──────────────────────────────────
paymentSchema.statics.pendingCount = async function () {
    return this.countDocuments({ status: "pending" });
};

// ─── Auto-expire old payments ───────────────────────
paymentSchema.statics.expireOld = async function () {
    const result = await this.updateMany(
        {
            status: "pending",
            expiresAt: { $lt: new Date() }
        },
        {
            $set: { status: "expired" }
        }
    );
    return result.modifiedCount;
};

module.exports = mongoose.model("Payment", paymentSchema);