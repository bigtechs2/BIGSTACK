// ──────────────────────────────────────────────────
//  BIGSTACK — /verify Command
//  Verify force-join status ⏤ STRICT
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const forceJoin = require("../../middlewares/forceJoin");

// ══════════════════════════════════════════════════
//  Check all channels ⏤ STRICT
// ══════════════════════════════════════════════════
async function checkAll(ctx) {
    const channels = config.forceJoin?.telegram || [];
    const missing = [];
    const results = [];

    for (const ch of channels) {
        try {
            const member = await ctx.api.getChatMember(ch.id, ctx.from.id);

            const ok = ["creator", "administrator", "member", "restricted"].includes(
                member.status
            );

            results.push({ name: ch.name, status: member.status, ok });
            logger.info(`[/verify] ${ch.name} → ${member.status} → ${ok}`);

            if (!ok) {
                missing.push({ ...ch, status: member.status });
            }
        } catch (err) {
            logger.warn(`[/verify] ${ch.name} check failed: ${err.message}`);
            results.push({ name: ch.name, status: "error", ok: false });
            missing.push({ ...ch, status: "error" });
        }
    }

    return { missing, results };
}

// ══════════════════════════════════════════════════
//  Friendly status text
// ══════════════════════════════════════════════════
function statusText(status) {
    const map = {
        creator: "✓ Owner",
        administrator: "✓ Admin",
        member: "✓ Member",
        restricted: "✓ Restricted",
        left: "✗ Left",
        kicked: "🚫 Banned",
        error: "⚠ Can't check"
    };
    return map[status] || `? ${status}`;
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "verify",
    aliases: ["check", "joined"],
    category: "utility",
    description: "Verify you joined all required channels",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: false,
        admin: false,
        premium: false,
        group: true,
        private: true
    },

    code: async (ctx) => {
        const { missing, results } = await checkAll(ctx);

        // ─── Build status report ─────────────────────
        let report = `◈ *VERIFICATION REPORT*\n\n`;

        for (const r of results) {
            report += `▸ ${r.name}\n`;
            report += `   ${statusText(r.status)}\n\n`;
        }

        // ─── If anything is missing ──────────────────
        if (missing.length > 0) {
            // Check if any are "kicked" (banned)
            const banned = missing.filter((m) => m.status === "kicked");

            if (banned.length > 0) {
                report +=
                    `🚫 *You are banned*\n\n` +
                    `Contact @${config.owner.username || "owner"} to be unbanned.\n\n`;
            } else {
                report +=
                    `✗ *Not verified*\n\n` +
                    `Join the missing channels and tap /verify again.\n\n`;
            }

            report += `${config.footer}`;

            return ctx.reply(report, {
                parse_mode: "Markdown",
                reply_markup: forceJoin.buildJoinKeyboard()
            });
        }

        // ─── All passed ──────────────────────────────
        await cache.set(`forceJoin:${ctx.from.id}`, true, 120);

        report +=
            `✓ *Verified*\n\n` +
            `You can now use BIGSTACK freely.\n\n` +
            `${config.footer}`;

        logger.info(`[/verify] ${ctx.from.id} verified all channels`);

        await ctx.reply(report, { parse_mode: "Markdown" });
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        {
            pattern: /^forcejoin:verify$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Checking..." });

                const { missing, results } = await checkAll(ctx);

                if (missing.length > 0) {
                    const banned = missing.filter((m) => m.status === "kicked");

                    let text = `◈ *VERIFICATION*\n\n`;
                    for (const r of results) {
                        text += `▸ ${r.name}: ${statusText(r.status)}\n`;
                    }
                    text += `\n`;

                    if (banned.length > 0) {
                        text += `🚫 You are banned from ${banned.length} channel(s).\n`;
                        text += `Contact @${config.owner.username || "owner"}.\n`;
                    } else {
                        text += `✗ Still missing ${missing.length} channel(s).\n`;
                        text += `Join and tap verify again.\n`;
                    }

                    try {
                        await ctx.editMessageText(text, {
                            parse_mode: "Markdown",
                            reply_markup: forceJoin.buildJoinKeyboard()
                        });
                    } catch {
                        await ctx.reply(text, {
                            parse_mode: "Markdown",
                            reply_markup: forceJoin.buildJoinKeyboard()
                        });
                    }
                    return;
                }

                await cache.set(`forceJoin:${ctx.from.id}`, true, 120);

                try {
                    await ctx.editMessageText(
                        `✓ *Verified*\n\n` +
                        `All channels joined.\n` +
                        `Send /start to begin.`,
                        { parse_mode: "Markdown" }
                    );
                } catch {
                    await ctx.reply(
                        `✓ *Verified*\n\nSend /start to begin.`,
                        { parse_mode: "Markdown" }
                    );
                }

                logger.info(`[/verify] ${ctx.from.id} verified via button`);
            }
        }
    ]
};