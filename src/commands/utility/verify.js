// ──────────────────────────────────────────────────
//  BIGSTACK — /verify Command
//  Verify force-join status
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const config = require("../../config");
const logger = require("../../core/logger");
const cache = require("../../core/cache");
const forceJoin = require("../../middlewares/forceJoin");

// ══════════════════════════════════════════════════
//  Check all channels
// ══════════════════════════════════════════════════
async function checkAll(ctx) {
    const channels = config.forceJoin?.telegram || [];
    const missing = [];

    for (const ch of channels) {
        try {
            const member = await ctx.api.getChatMember(ch.id, ctx.from.id);
            const ok = ["creator", "administrator", "member", "restricted"].includes(
                member.status
            );
            if (!ok) missing.push(ch);
        } catch {
            missing.push(ch);
        }
    }

    return missing;
}

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "verify",
    aliases: ["check", "joined"],
    category: "utility",
    description: "Verify that you joined all required channels",
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
        const missing = await checkAll(ctx);

        if (missing.length > 0) {
            return ctx.reply(
                `◐ *Not Yet*\n\n` +
                `▸ You are missing ${missing.length} channel(s).\n` +
                `▸ Tap the buttons below to join.`,
                {
                    parse_mode: "Markdown",
                    reply_markup: forceJoin.buildJoinKeyboard()
                }
            );
        }

        // Cache pass
        await cache.set(`forceJoin:${ctx.from.id}`, true, 120);

        logger.info(`[/verify] ${ctx.from.id} verified all channels`);

        await ctx.reply(
            `✓ *Verified*\n\n` +
            `▸ You have joined all required channels.\n` +
            `▸ You can now use BIGSTACK freely.\n\n` +
            `▸ ${config.footer}`,
            { parse_mode: "Markdown" }
        );
    },

    // ══════════════════════════════════════════════
    //  Callbacks
    // ══════════════════════════════════════════════
    callbacks: [
        {
            pattern: /^forcejoin:verify$/,
            handler: async (ctx) => {
                await ctx.answerCallbackQuery({ text: "Checking..." });

                const missing = await checkAll(ctx);

                if (missing.length > 0) {
                    try {
                        await ctx.editMessageText(
                            `◐ *Not Yet*\n\n` +
                            `▸ You still need to join ${missing.length} channel(s).\n` +
                            `▸ Tap the buttons below to join.`,
                            {
                                parse_mode: "Markdown",
                                reply_markup: forceJoin.buildJoinKeyboard()
                            }
                        );
                    } catch {
                        // Ignore
                    }
                    return;
                }

                // Success ⏤ cache + edit message
                await cache.set(`forceJoin:${ctx.from.id}`, true, 120);

                try {
                    await ctx.editMessageText(
                        `✓ *Verified*\n\n` +
                        `▸ All channels joined.\n` +
                        `▸ You can now use BIGSTACK freely.\n\n` +
                        `▸ Send /start to begin.`,
                        { parse_mode: "Markdown" }
                    );
                } catch {
                    // Ignore
                }

                logger.info(`[/verify] ${ctx.from.id} verified via button`);
            }
        }
    ]
};