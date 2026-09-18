// ──────────────────────────────────────────────────
//  BIGSTACK — User Logger Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Runs on EVERY message. Does:
//  - Registers user in DB (first time)
//  - Detects command use
//  - Forwards new users to ACTIVITY group
//  - Tracks command in stats
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const statsTracker = require("../core/statsTracker");
const User = require("../database/models/User");

// ─── Track which users we've already registered this session ─
// Prevents duplicate DB writes for the same user
const registeredUsers = new Set();

async function userLogger(ctx, next) {
    // ─── Skip if no user (channels, etc.) ───────────
    if (!ctx.from || ctx.from.is_bot) {
        return next();
    }

    const userId = String(ctx.from.id);

    // ─── 1. First-time registration in DB ──────────
    if (!registeredUsers.has(userId)) {
        try {
            let user = await User.findOne({ telegramId: userId });

            if (!user) {
                user = await User.create({
                    telegramId: userId,
                    username: ctx.from.username || null,
                    firstName: ctx.from.first_name || null,
                    lastName: ctx.from.last_name || null,
                    language: ctx.from.language_code || "en",
                    coins: 0,
                    premium: false,
                    banned: false,
                    createdAt: new Date(),
                    lastSeen: new Date()
                });

                // ─── Announce new user to ACTIVITY group ─
                await logger.activity("new_user", {
                    name: `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim(),
                    username: ctx.from.username || null,
                    userId
                }).catch(() => {});

                // ─── Track for stats ─────────────────
                await statsTracker.trackNewUser(ctx);

                logger.info(`[userLogger] 👤 new user: ${userId} (@${ctx.from.username || "no-username"})`);
            } else {
                // Update last seen + username (they might have changed it)
                user.lastSeen = new Date();
                if (ctx.from.username) user.username = ctx.from.username;
                await user.save().catch(() => {});
            }

            // Attach user to ctx for other middlewares
            ctx.user = user;

            // Remember we've registered this user
            registeredUsers.add(userId);

        } catch (err) {
            logger.warn(`[userLogger] registration failed: ${err.message}`);
            // Continue anyway — don't block the bot
        }
    } else {
        // Already known — just load from DB (cache would be better)
        try {
            ctx.user = await User.findOne({ telegramId: userId });
        } catch {
            ctx.user = null;
        }
    }

    // ─── 2. Track command if this is one ───────────
    // Note: commandName is attached by the loader middleware
    // We track it AFTER the command runs to catch success/failure.
    // So here, we just setup the timer.

    const startTime = Date.now();

    // ─── 3. Run the next middleware/command ────────
    try {
        await next();
    } catch (err) {
        // ─── Command threw error ────────────────────
        if (ctx.commandName) {
            await statsTracker.trackCommand(ctx, {
                success: false,
                durationMs: Date.now() - startTime,
                error: err
            }).catch(() => {});
        }
        throw err; // re-throw so errorHandler can catch
    }

    // ─── 4. If a command ran, track it ─────────────
    if (ctx.commandName) {
        const durationMs = Date.now() - startTime;

        await statsTracker.trackCommand(ctx, {
            success: true,
            durationMs,
            provider: ctx.provider || null
        }).catch(() => {});

        // Optional: forward command use to ACTIVITY group
        // (disabled by default in config to prevent spam)
        if (ctx.config?.logging?.groups?.activity?.sendCommands) {
            await logger.activity("command", {
                userId,
                username: ctx.from.username,
                command: ctx.commandName,
                chatType: ctx.chat?.type
            }).catch(() => {});
        }
    }
}

// ─── Clear cache on shutdown ────────────────────────
function cleanup() {
    registeredUsers.clear();
}

// ─── Export ─────────────────────────────────────────
module.exports = userLogger;
module.exports.cleanup = cleanup;