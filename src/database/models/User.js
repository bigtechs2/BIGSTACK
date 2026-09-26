// ──────────────────────────────────────────────────
//  BIGSTACK — User Model
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Stores every Telegram user who has interacted
//  with the bot. Tracks coins, premium, language,
//  daily rewards, streak, referral, and activity.
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // ══════════════════════════════════════════
        //  IDENTITY
        // ══════════════════════════════════════════
        telegramId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        username: { type: String, default: null },
        firstName: { type: String, default: null },
        lastName: { type: String, default: null },
        language: { type: String, default: "en" },
        isBot: { type: Boolean, default: false },

        // ══════════════════════════════════════════
        //  COINS & ECONOMY
        // ══════════════════════════════════════════
        coins: { type: Number, default: 0, min: 0 },
        totalEarned: { type: Number, default: 0, min: 0 },
        totalSpent: { type: Number, default: 0, min: 0 },

        // ══════════════════════════════════════════
        //  PREMIUM
        // ══════════════════════════════════════════
        premium: { type: Boolean, default: false },
        premiumExpiry: { type: Date, default: null },
        premiumPlan: {
            type: String,
            enum: ["weekly", "monthly", "yearly", null],
            default: null
        },
        premiumSince: { type: Date, default: null },

        // ══════════════════════════════════════════
        //  DAILY REWARD + STREAK
        // ══════════════════════════════════════════
        lastClaimAt: { type: Date, default: null },
        totalClaims: { type: Number, default: 0 },
        streakDays: { type: Number, default: 0 },
        lastStreakAt: { type: Date, default: null },

        // ══════════════════════════════════════════
        //  REFERRAL
        // ══════════════════════════════════════════
        referrerId: { type: String, default: null, index: true },
        referralCount: { type: Number, default: 0 },
        referralEarnings: { type: Number, default: 0 },
        referralCode: {
            type: String,
            default: null,
            unique: true,
            sparse: true,
            index: true
        },

        // ══════════════════════════════════════════
        //  AI
        // ══════════════════════════════════════════
        aiEnabled: { type: Boolean, default: false },
        aiMessagesToday: { type: Number, default: 0 },
        aiResetAt: { type: Date, default: null },

        // ══════════════════════════════════════════
        //  ACTIVITY
        // ══════════════════════════════════════════
        totalCommands: { type: Number, default: 0 },
        totalDownloads: { type: Number, default: 0 },
        firstSeen: { type: Date, default: Date.now },
        lastSeen: { type: Date, default: Date.now },

        // ══════════════════════════════════════════
        //  STATUS
        // ══════════════════════════════════════════
        banned: { type: Boolean, default: false },
        banReason: { type: String, default: null },
        bannedAt: { type: Date, default: null },
        isAdmin: { type: Boolean, default: false },
        isOwner: { type: Boolean, default: false },

        // ══════════════════════════════════════════
        //  PREFERENCES
        // ══════════════════════════════════════════
        settings: {
            notifications: { type: Boolean, default: true },
            autoDownload: { type: Boolean, default: false },
            preferredQuality: {
                type: String,
                enum: ["144p", "240p", "360p", "480p", "720p", "1080p", "1440p", "2160p", "best"],
                default: "720p"
            },
            preferredFormat: {
                type: String,
                enum: ["mp3", "mp4", "webm", "auto"],
                default: "auto"
            },
            darkMode: { type: Boolean, default: true },
            aiVoiceReplies: { type: Boolean, default: false }
        },

        notes: { type: String, default: null }
    },
    {
        collection: "users",
        timestamps: true,
        versionKey: false
    }
);

// ══════════════════════════════════════════════════
//  INDEXES
// ══════════════════════════════════════════════════

userSchema.index({ coins: -1 });
userSchema.index({ premium: 1, premiumExpiry: -1 });
userSchema.index({ lastSeen: -1 });
userSchema.index({ referralCount: -1 });
userSchema.index({ createdAt: -1 });

// ══════════════════════════════════════════════════
//  VIRTUALS
// ══════════════════════════════════════════════════

userSchema.virtual("premiumActive").get(function () {
    if (!this.premium) return false;
    if (!this.premiumExpiry) return false;
    return this.premiumExpiry > new Date();
});

userSchema.virtual("premiumDaysLeft").get(function () {
    if (!this.premiumExpiry) return 0;
    const diff = this.premiumExpiry - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

userSchema.virtual("displayName").get(function () {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.join(" ") || "Unknown";
});

userSchema.virtual("mention").get(function () {
    return `<a href="tg://user?id=${this.telegramId}">${this.displayName}</a>`;
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// ══════════════════════════════════════════════════
//  INSTANCE METHODS
// ══════════════════════════════════════════════════

// ─── Add coins ──────────────────────────────────────
userSchema.methods.addCoins = function (amount) {
    if (amount <= 0) return this;
    this.coins += amount;
    this.totalEarned += amount;
    return this;
};

// ─── Deduct coins ───────────────────────────────────
userSchema.methods.deductCoins = function (amount) {
    if (amount <= 0) return this;
    if (this.coins < amount) throw new Error("Insufficient coins");
    this.coins -= amount;
    this.totalSpent += amount;
    return this;
};

// ─── Can afford? ────────────────────────────────────
userSchema.methods.canAfford = function (amount) {
    return this.coins >= amount;
};

// ─── Upgrade to premium ─────────────────────────────
userSchema.methods.upgradePremium = function (plan) {
    const durations = { weekly: 7, monthly: 30, yearly: 365 };
    const days = durations[plan] || 30;
    const now = new Date();

    const base =
        this.premiumActive && this.premiumExpiry > now
            ? this.premiumExpiry
            : now;

    this.premiumExpiry = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    this.premium = true;
    this.premiumPlan = plan;
    if (!this.premiumSince) this.premiumSince = now;

    return this;
};

// ─── Remove premium ─────────────────────────────────
userSchema.methods.removePremium = function () {
    this.premium = false;
    this.premiumExpiry = null;
    this.premiumPlan = null;
    return this;
};

// ─── Ban user ───────────────────────────────────────
userSchema.methods.ban = function (reason = "No reason given") {
    this.banned = true;
    this.banReason = reason;
    this.bannedAt = new Date();
    return this;
};

// ─── Unban user ─────────────────────────────────────
userSchema.methods.unban = function () {
    this.banned = false;
    this.banReason = null;
    this.bannedAt = null;
    return this;
};

// ─── Update last seen ───────────────────────────────
userSchema.methods.touch = function () {
    this.lastSeen = new Date();
    return this;
};

// ─── Increment command count ────────────────────────
userSchema.methods.recordCommand = function () {
    this.totalCommands += 1;
    this.lastSeen = new Date();
    return this;
};

// ─── Increment download count ───────────────────────
userSchema.methods.recordDownload = function () {
    this.totalDownloads += 1;
    this.lastSeen = new Date();
    return this;
};

// ─── Claim daily reward (with streak) ───────────────
userSchema.methods.claimDaily = function (amount) {
    this.lastClaimAt = new Date();
    this.totalClaims += 1;
    this.addCoins(amount);

    // ─── Streak logic ─────────────────────────────
    const now = new Date();
    const last = this.lastStreakAt;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (!last) {
        this.streakDays = 1;
    } else {
        const diff = now.getTime() - last.getTime();
        if (diff < oneDayMs * 2) {
            // Consecutive day
            this.streakDays += 1;
        } else {
            // Streak reset
            this.streakDays = 1;
        }
    }
    this.lastStreakAt = now;

    return this;
};

// ─── Can claim daily? ───────────────────────────────
userSchema.methods.canClaimDaily = function (cooldownMs = 24 * 60 * 60 * 1000) {
    if (!this.lastClaimAt) return { ok: true, remaining: 0 };

    const elapsed = Date.now() - this.lastClaimAt.getTime();
    const remaining = cooldownMs - elapsed;

    if (remaining <= 0) return { ok: true, remaining: 0 };
    return { ok: false, remaining };
};

// ─── Generate a referral code ───────────────────────
userSchema.methods.generateReferralCode = function () {
    if (this.referralCode) return this.referralCode;

    const code = `BS${String(this.telegramId).slice(-6)}${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

    this.referralCode = code;
    return code;
};

// ─── Apply referral (for new user) ──────────────────
userSchema.methods.applyReferral = function (referrerId, refereeBonus) {
    if (this.referrerId) return this; // already referred
    this.referrerId = referrerId;
    this.addCoins(refereeBonus);
    return this;
};

// ══════════════════════════════════════════════════
//  STATIC METHODS
// ══════════════════════════════════════════════════

userSchema.statics.findOrCreate = async function (telegramUser) {
    const telegramId = String(telegramUser.id);

    let user = await this.findOne({ telegramId });

    if (!user) {
        user = await this.create({
            telegramId,
            username: telegramUser.username || null,
            firstName: telegramUser.first_name || null,
            lastName: telegramUser.last_name || null,
            language: telegramUser.language_code || "en",
            isBot: telegramUser.is_bot || false
        });
        user.generateReferralCode();
        await user.save().catch(() => {});
    } else {
        if (telegramUser.username) user.username = telegramUser.username;
        if (telegramUser.first_name) user.firstName = telegramUser.first_name;
        if (telegramUser.last_name) user.lastName = telegramUser.last_name;
        user.lastSeen = new Date();
    }

    return user;
};

userSchema.statics.getTopByCoins = async function (limit = 10) {
    return this.find({ banned: false })
        .sort({ coins: -1 })
        .limit(limit)
        .select("telegramId username firstName coins premium");
};

userSchema.statics.totalUsers = async function () {
    return this.countDocuments({ banned: false });
};

userSchema.statics.premiumCount = async function () {
    return this.countDocuments({
        premium: true,
        premiumExpiry: { $gt: new Date() }
    });
};

userSchema.statics.activeSince = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.countDocuments({ lastSeen: { $gte: since } });
};

userSchema.statics.expirePremium = async function () {
    const result = await this.updateMany(
        {
            premium: true,
            premiumExpiry: { $lt: new Date() }
        },
        {
            $set: { premium: false, premiumPlan: null }
        }
    );
    return result.modifiedCount;
};

// ─── Export ─────────────────────────────────────────
module.exports = mongoose.model("User", userSchema);