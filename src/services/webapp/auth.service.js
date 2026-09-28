// ──────────────────────────────────────────────────
//  BIGSTACK — Mini App Auth Service
//  Validates Telegram initData signature
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const logger = require("../../core/logger");

const BOT_TOKEN = process.env.BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || BOT_TOKEN;

// ══════════════════════════════════════════════════
//  Validate initData signature
// ══════════════════════════════════════════════════
function validateInitData(initData) {
    if (!initData || typeof initData !== "string") {
        return { valid: false, reason: "Missing initData" };
    }

    try {
        // ─── Parse query string ─────────────────────
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");
        params.delete("hash");

        // ─── Build data-check-string ────────────────
        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");

        // ─── Compute expected hash ──────────────────
        const secretKey = crypto
            .createHmac("sha256", "WebAppData")
            .update(BOT_TOKEN)
            .digest();

        const expectedHash = crypto
            .createHmac("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");

        if (expectedHash !== hash) {
            return { valid: false, reason: "Invalid hash" };
        }

        // ─── Check auth_date (max 24h old) ──────────
        const authDate = parseInt(params.get("auth_date")) * 1000;
        const age = Date.now() - authDate;

        if (age > 24 * 60 * 60 * 1000) {
            return { valid: false, reason: "InitData expired" };
        }

        // ─── Parse user JSON ────────────────────────
        const user = JSON.parse(params.get("user") || "{}");

        return {
            valid: true,
            user: {
                id: String(user.id),
                username: user.username || null,
                firstName: user.first_name || null,
                lastName: user.last_name || null,
                languageCode: user.language_code || "en"
            },
            authDate
        };

    } catch (err) {
        return { valid: false, reason: err.message };
    }
}

// ══════════════════════════════════════════════════
//  Issue JWT for the Mini App
// ══════════════════════════════════════════════════
function issueToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// ══════════════════════════════════════════════════
//  Verify JWT
// ══════════════════════════════════════════════════
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    validateInitData,
    issueToken,
    verifyToken
};