// ──────────────────────────────────────────────────
//  BIGSTACK — AI Memory Model
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Stores every AI conversation message forever.
//  Never deleted. Enables full conversation recall.
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");

const aiMemorySchema = new mongoose.Schema(
    {
        // ══════════════════════════════════════════
        //  IDENTITY
        // ══════════════════════════════════════════
        userId: {
            type: String,
            required: true,
            index: true
        },
        chatId: {
            type: String,
            default: null,
            index: true
        },

        // ══════════════════════════════════════════
        //  MESSAGE
        // ══════════════════════════════════════════
        role: {
            type: String,
            enum: ["user", "assistant", "system"],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["text", "voice", "image", "video"],
            default: "text"
        },

        // ══════════════════════════════════════════
        //  METADATA
        // ══════════════════════════════════════════
        provider: {
            type: String,
            default: null
        },
        tokens: {
            type: Number,
            default: 0
        },
        mediaUrl: {
            type: String,
            default: null
        },

        // ══════════════════════════════════════════
        //  TIMING
        // ══════════════════════════════════════════
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        collection: "ai_memories",
        timestamps: false,
        versionKey: false
    }
);

// ══════════════════════════════════════════════════
//  INDEXES
// ══════════════════════════════════════════════════
aiMemorySchema.index({ userId: 1, timestamp: -1 });
aiMemorySchema.index({ chatId: 1, timestamp: -1 });

// ══════════════════════════════════════════════════
//  STATIC METHODS
// ══════════════════════════════════════════════════

// ─── Get recent conversation for a user ─────────────
aiMemorySchema.statics.getRecent = async function (userId, limit = 20) {
    const messages = await this.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

    // Reverse so oldest is first
    return messages.reverse().map((m) => ({
        role: m.role,
        content: m.content
    }));
};

// ─── Get full conversation history ──────────────────
aiMemorySchema.statics.getHistory = async function (userId, limit = 100) {
    const messages = await this.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

    return messages.reverse();
};

// ─── Count messages for user ────────────────────────
aiMemorySchema.statics.countForUser = async function (userId) {
    return this.countDocuments({ userId });
};

// ─── Clear conversation ─────────────────────────────
aiMemorySchema.statics.clearForUser = async function (userId) {
    const result = await this.deleteMany({ userId });
    return result.deletedCount;
};

// ─── Save a message ─────────────────────────────────
aiMemorySchema.statics.saveMessage = async function ({
    userId,
    chatId = null,
    role,
    content,
    type = "text",
    provider = null,
    mediaUrl = null
}) {
    if (!userId || !role || !content) return null;

    // Truncate content to prevent MongoDB document bloat
    const safeContent = String(content).slice(0, 5000);

    return this.create({
        userId,
        chatId,
        role,
        content: safeContent,
        type,
        provider,
        mediaUrl,
        timestamp: new Date()
    });
};

// ─── Export ─────────────────────────────────────────
module.exports = mongoose.model("AIMemory", aiMemorySchema);