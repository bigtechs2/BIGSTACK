// ──────────────────────────────────────────────────
//  BIGSTACK — Force Join Middleware (STRICT)
//  Blocks ALL commands unless verified member
//  Only /verify bypasses ⏤ everything else shows join screen
//  Re-checks membership on every command (short cache)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../config");
const logger = require("../core/logger");
const cache = require("../core/cache");

// ─── Short cache ⏤ 30s ⏤ catches unfollow quickly ──
const CACHE_TTL = 30;

// ══════════════════════════════════════════════════
//  ONLY /verify is allowed through
// ══════════════════════════════════════════════════
const BYPASS_COMMANDS = ["verify"];
const BYPASS_CALLBACKS = ["forcejoin:verify"];

// ══════════════════════════════════════════════════
//  Check single channel membership
// ══════════════════════════════════════════════════
async function checkMember(ctx, channelId, channelName) {
    try {
        const member = await ctx.api.getChatMember(channelId, ctx.from.id);

        const ok = ["creator", "administrator", "member", "restricted"].includes(
            member.status
        );

        logger.info(
            `[forceJoin] ${channelName} → ${ctx.from.id} status=${member.status} → ${ok ? "✓ PASS" : "✗ BLOCK"}`
        );

        return { ok, status: member.status };
    } catch (err) {
        const msg = err.message || "";
        logger.warn(`[forceJoin] ${channelName} check error: ${msg}`);
        return { ok: false, status: "unreachable" };
    }
}

// ══════════════════════════════════════════════════
//  Build join keyboard ⏤ channel + group + WhatsApp
// ══════════════════════════════════════════════════
function buildJoinKeyboard() {
    const rows = [];

    for (const ch of config.forceJoin?.telegram || []) {
        const emoji = ch.type === "group" ? "👥" : "📢";
        rows.push([{ text: `${emoji} Join ${ch.name}`, url: ch.url }]);
    }

    for (const wa of config.forceJoin?.whatsapp || []) {
        rows.push([{ text: `💬 Join ${wa.name}`, url: wa.url }]);
    }

    rows.push([
        { text: "✓ I Have Joined — Verify", callback_data: "forcejoin:verify" }
    ]);

    return { inline_keyboard: rows };
}

function buildJoinText() {
    const channels = config.forceJoin?.telegram || [];
    const whatsapp = config.forceJoin?.whatsapp || [];

    const lines = [
        `◈ *Access Required*`,
        ``,
        `▸ You must join our channels`,
        `   to use BIGSTACK.`,
        ``
    ];

    if (channels.length > 0) {
        lines.push(`📢 *Telegram*`);
        for (const ch of channels) {
            const icon = ch.type === "group" ? "👥" : "📢";
            lines.push(`   ${icon} ${ch.name}`);
        }
        lines.push("");
    }

    if (whatsapp.length > 0) {
        lines.push(`💬 *WhatsApp*`);
        for (const wa of whatsapp) {
            lines.push(`   💬 ${wa.name}`);
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
    // ─── Skip if disabled ───────────────────────────
    if (!config.forceJoin?.enabled) return next();

    // ─── Skip if no user ────────────────────────────
    if (!ctx.from || ctx.from.is_bot) return next();

    // ─── Owner bypass ───────────────────────────────
    if (config.isOwner(ctx.from.id)) return next();

    // ─── Only /verify passes ────────────────────────
    if (ctx.commandName && BYPASS_COMMANDS.includes(ctx.commandName)) {
        return next();
    }

    // ─── Only verify callback passes ────────────────
    if (ctx.callbackQuery?.data &&
        BYPASS_CALLBACKS.includes(ctx.callbackQuery.data)) {
        return next();
    }

    // ─── Group admins bypass ────────────────────────
    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        try {
            const admins = await ctx.getChatAdministrators();
            if (admins.some((a) => a.user.id === ctx.from.id)) {
                return next();
            }
        } catch {
            // ignore
        }
    }

    const userId = String(ctx.from.id);
    const cacheKey = `forceJoin:${userId}`;

    // ─── Cache check ⏤ 30s only ─────────────────────
    const cached = await cache.get(cacheKey);
    if (cached === true) {
        // Cache expired or hit → continue
        // Note: short TTL means we re-check every 30s to catch unfollow
    }

    // ═══════════════════════════════════════════════
    //  Check every channel + group
    // ═══════════════════════════════════════════════
    const channels = config.forceJoin?.telegram || [];

    logger.info(`[forceJoin] checking ${channels.length} channel(s) for ${userId}`);

    for (const ch of channels) {
        const result = await checkMember(ctx, ch.id, ch.name);

        if (!result.ok) {
            // ─── Not a member or unfollowed ─────────
            logger.info(
                `[forceJoin] ✗ ${userId} BLOCKED by ${ch.name} (${result.status})`
            );

            // Invalidate cache so next check is fresh
            await cache.del(cacheKey).catch(() => {});

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

    // ═══════════════════════════════════════════════
    //  All passed ⏤ cache for 30s
    // ═══════════════════════════════════════════════
    logger.info(`[forceJoin] ✓ ${userId} PASSED`);

    await cache.set(cacheKey, true, CACHE_TTL);

    return next();
}

// ─── Export ─────────────────────────────────────────
module.exports = forceJoin;
module.exports.buildJoinText = buildJoinText;
module.exports.buildJoinKeyboard = buildJoinKeyboard;