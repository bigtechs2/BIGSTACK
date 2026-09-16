// ──────────────────────────────────────────────────
//  BIGSTACK — Bot Instance
//  © BIGSTACK by bigmanjtech™ with ♥
// ──────────────────────────────────────────────────

const { Bot } = require("grammy");
const config = require("./config");

// ─── Create the bot instance ────────────────────────
const bot = new Bot(process.env.BOT_TOKEN, {
    // Optional configuration (can be customized)
    client: {
        timeoutSeconds: 60,
    },
});

// ─── Attach config to the bot for easy access ───────
bot.config = config;

// ─── Catch bot-specific errors ──────────────────────
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`❌ Error while handling update ${ctx.update.update_id}:`);
    console.error(err.error);

    // Try to reply to the user so they aren't left hanging
    try {
        ctx.reply("❌ Something went wrong. Please try again later.");
    } catch (e) {
        // Ignore if we can't reply
    }
});

// ─── Export for use in index.js ─────────────────────
module.exports = bot;