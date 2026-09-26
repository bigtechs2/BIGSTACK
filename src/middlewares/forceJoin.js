// ──────────────────────────────────────────────────
//  BIGSTACK — Force Join Middleware
//  Blocks users who haven't joined required channels
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const cache = require("../core/cache");

// ─── Cache TTL for join checks (2 min) ──────────────
const CACHE_TTL = 120;

// ─── Commands always allowed (bypass force-join) ────
const ALLOWED_COMMANDS = [
    "start",
    "help",
    "menu",
    "verify",
    "about",
    "lang"
];

// ══════════════════════════════════════════════════
//  Check if user is in a channel/group
// ══════════════════════════════════════════════════
async function isMember(ctx, channelId) {
    try {
        const member = await ctx.api.getChatMember(channelId, ctx.from.id);

        const ok = ["creator", "administrator", "member", "restricted"].includes(
            member.status
        );

        return ok;
    } catch (err) {
        // If check fails, assume NOT joined (safer)
        logger.warn(`[forceJoin] check failed for ${channelId}: ${err.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════════
//  Build the "join channels" screen
// ══════════════════════════════════════════════════
function buildJoinKeyboard() {
    const rows = [];

    // Telegram channels ⏤ one button per row
    for (const ch of config.forceJoin?.telegram || []) {
        rows.push([{ text: `➤ Join ${ch.name}`, url: ch.url }]);
    }

    // WhatsApp channel
    for (const wa of config.forceJoin?.whatsapp || []) {
        rows.push([{ text: `➤ Join ${wa.name}`, url: wa.url }]);
    }

    // Verify button
    rows.push([{ text: "✓ Verify Joined", callback_data: "forcejoin:verify" }]);

    return { inline_keyboard: rows };
}

function buildJoinText() {
    const channels = config.forceJoin?.telegram || [];
    const whatsapp = config.forceJoin?.whatsapp || [];

    const lines = [
        `◈ *Access Required*`,
        ``,
        `▸ You must join our channels first.`,
        ``
    ];

    if (channels.length > 0) {
        lines.push(`◈ *Telegram*`);
        for (const ch of channels) {
            lines.push(`   ➤ ${ch.name}`);
        }
        lines.push("");
    }

    if (whatsapp.length > 0) {
        lines.push(`◈ *WhatsApp*`);
        for (const wa of whatsapp) {
            lines.push(`   ➤ ${wa.name}`);
        }
        lines.push("");
    }

    lines.push(`▸ After joining, tap *✓ Verify*`);
    lines.push("");
    lines.push(`▸ ${config.footer}`);

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function forceJoin(ctx, next) {
    // ─── Skip if force-join disabled ─────────────────
    if (!config.forceJoin?.enabled) return next();

    // ─── Skip if no user (channel updates) ───────────
    if (!ctx.from || ctx.from.is_bot) return next();

    // ─── Skip if owner ───────────────────────────────
    if (config.isOwner(ctx.from.id)) return next();

    // ─── Skip allowed commands ───────────────────────
    if (ctx.commandName && ALLOWED_COMMANDS.includes(ctx.commandName)) {
        return next();
    }

    // ─── Skip verify callback ────────────────────────
    if (ctx.callbackQuery?.data === "forcejoin:verify") return next();

    // ─── Skip if user is admin in the group ──────────
    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        try {
            const admins = await ctx.getChatAdministrators();
            if (admins.some((a) => a.user.id === ctx.from.id)) return next();
        } catch {
            // Ignore ⏤ continue with check
        }
    }

    const userId = String(ctx.from.id);

    // ─── Check cache first ───────────────────────────
    const cacheKey = `forceJoin:${userId}`;
    const cached = await cache.get(cacheKey);

    if (cached === true) return next();

    // ─── Check all Telegram channels ─────────────────
    const channels = config.forceJoin?.telegram || [];

    for (const ch of channels) {
        const ok = await isMember(ctx, ch.id);
        if (!ok) {
            // ─── User is not a member ⏤ block ─────────
            logger.info(`[forceJoin] ${userId} missing channel ${ch.id}`);

            if (ctx.callbackQuery) {
                return ctx.answerCallbackQuery({
                    text: "✗ Join channels first",
                    show_alert: true
                });
            }

            return ctx.reply(buildJoinText(), {
                parse_mode: "Markdown",
                reply_markup: buildJoinKeyboard()
            });
        }
    }

    // ─── All checks passed ⏤ cache it ────────────────
    await cache.set(cacheKey, true, CACHE_TTL);

    return next();
}

module.exports = forceJoin;

// ─── Exported helpers (used by /verify) ─────────────
module.exports.buildJoinText = buildJoinText;
module.exports.buildJoinKeyboard = buildJoinKeyboard;