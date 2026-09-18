// ──────────────────────────────────────────────────
//  BIGSTACK — CommandStat Model
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Tracks every command use for /popular stats.
//  Indexed for fast aggregation queries.
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");

const commandStatSchema = new mongoose.Schema(
    {
        // ─── Command info ───
        command: {
            type: String,
            required: true,
            index: true
        },
        category: {
            type: String,
            default: null
        },

        // ─── User info ───
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

        // ─── Chat info ───
        chatId: {
            type: String,
            default: null
        },
        chatType: {
            type: String,
            enum: ["private", "group", "supergroup", "channel", null],
            default: null
        },

        // ─── Result ───
        success: {
            type: Boolean,
            default: true,
            index: true
        },
        provider: {
            type: String,
            default: null
        },
        durationMs: {
            type: Number,
            default: 0
        },
        errorMessage: {
            type: String,
            default: null
        },

        // ─── Timing ───
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        collection: "command_stats",
        timestamps: false
    }
);

// ─── Compound indexes for fast queries ──────────────
commandStatSchema.index({ command: 1, timestamp: -1 });
commandStatSchema.index({ userId: 1, timestamp: -1 });
commandStatSchema.index({ success: 1, timestamp: -1 });

// ══════════════════════════════════════════════════
//  📊 STATIC METHODS — Aggregations
// ══════════════════════════════════════════════════

// ─── Top commands in the last N hours ───────────────
commandStatSchema.statics.getTopCommands = async function (hours = 24, limit = 10) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.aggregate([
        { $match: { timestamp: { $gte: since }, success: true } },
        { $group: { _id: "$command", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { _id: 0, name: "$_id", count: 1 } }
    ]);
};

// ─── Count distinct active users in the last N hours ─
commandStatSchema.statics.getActiveUserCount = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await this.distinct("userId", {
        timestamp: { $gte: since }
    });

    return result.length;
};

// ─── Total downloads in the last N hours ────────────
commandStatSchema.statics.getDownloadCount = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.countDocuments({
        timestamp: { $gte: since },
        category: "downloader",
        success: true
    });
};

// ─── Error count in the last N hours ────────────────
commandStatSchema.statics.getErrorCount = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.countDocuments({
        timestamp: { $gte: since },
        success: false
    });
};

// ─── Get stats for a specific user ──────────────────
commandStatSchema.statics.getUserStats = async function (userId) {
    const total = await this.countDocuments({ userId });

    const topCommands = await this.aggregate([
        { $match: { userId: String(userId) } },
        { $group: { _id: "$command", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id", count: 1 } }
    ]);

    return { total, topCommands };
};

// ─── Delete old records (cleanup job) ───────────────
commandStatSchema.statics.cleanupOld = async function (daysOld = 90) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await this.deleteMany({ timestamp: { $lt: cutoff } });
    return result.deletedCount;
};

// ─── Export ─────────────────────────────────────────
module.exports = mongoose.model("CommandStat", commandStatSchema);