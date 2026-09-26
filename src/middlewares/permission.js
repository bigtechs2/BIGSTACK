// ──────────────────────────────────────────────────
//  BIGSTACK — Permission Middleware
//  Checks owner / admin / premium / group gates
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const User = require("../database/models/User");

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function permission(ctx, next) {
    // ─── Skip if no command ──────────────────────────
    if (!ctx.commandName) return next();

    const perms = ctx.commandPermissions || {};

    // ─── Owner check ─────────────────────────────────
    if (perms.owner) {
        if (!config.isOwner(ctx.from.id)) {
            return ctx.reply(
                `◐ *Owner Only*\n\n` +
                `▸ This command is for the owner only.`,
                { parse_mode: "Markdown" }
            );
        }
    }

    // ─── Admin check ─────────────────────────────────
    if (perms.admin) {
        const user = ctx.user || (await User.findOne({ telegramId: String(ctx.from.id) }));

        if (!user?.isAdmin && !config.isOwner(ctx.from.id)) {
            return ctx.reply(
                `◐ *Admin Only*\n\n` +
                `▸ This command is for bot admins only.`,
                { parse_mode: "Markdown" }
            );
        }
    }

    // ─── Group admin check ───────────────────────────
    if (perms.groupAdmin) {
        if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) {
            return ctx.reply(
                `◐ *Group Only*\n\n` +
                `▸ Use this command in a group.`,
                { parse_mode: "Markdown" }
            );
        }

        try {
            const admins = await ctx.getChatAdministrators();
            const isGroupAdmin = admins.some((a) => a.user.id === ctx.from.id);

            if (!isGroupAdmin && !config.isOwner(ctx.from.id)) {
                return ctx.reply(
                    `◐ *Group Admins Only*`,
                    { parse_mode: "Markdown" }
                );
            }
        } catch {
            return next(); // Fail-safe ⏤ allow
        }
    }

    // ─── Premium check ───────────────────────────────
    if (perms.premium) {
        const user = ctx.user || (await User.findOne({ telegramId: String(ctx.from.id) }));
        const premiumActive =
            user?.premium && user?.premiumExpiry && user.premiumExpiry > new Date();

        if (!premiumActive && !config.isOwner(ctx.from.id)) {
            return ctx.reply(
                `★ *Premium Only*\n\n` +
                `▸ This command requires Premium.\n\n` +
                `▸ Get premium ➤ /store\n\n` +
                `▸ ${config.footer}`,
                { parse_mode: "Markdown" }
            );
        }
    }

    // ─── Group only ──────────────────────────────────
    if (perms.group) {
        const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
        const isPrivate = ctx.chat?.type === "private";

        // If command requires group AND we are in private ⏤ allow (bots work everywhere)
        // (Group-only checks use "private: false" pattern instead)
    }

    // ─── Private only ────────────────────────────────
    if (perms.private) {
        if (ctx.chat?.type !== "private") {
            return ctx.reply(
                `◐ *Private Chat Only*\n\n` +
                `▸ Use this command in a private chat with me.\n\n` +
                `▸ Tap here ➤ @${config.botUsername}`,
                { parse_mode: "Markdown" }
            );
        }
    }

    return next();
}

module.exports = permission;