// ──────────────────────────────────────────────────
//  BIGSTACK — Menu Handler Middleware
//  Handles all menu:* callback buttons
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const logger = require("../core/logger");
const config = require("../config");

// ══════════════════════════════════════════════════
//  Category definitions
// ══════════════════════════════════════════════════
const CATEGORIES = {
    downloader: {
        title: "◇ DOWNLOADER",
        desc: "Download media from any supported platform.",
        commands: [
            ["play",        "YouTube audio search"],
            ["ytmp3",       "YouTube → MP3"],
            ["ytmp4",       "YouTube → MP4"],
            ["spotify",     "Spotify track URL"],
            ["spotifyplay", "Spotify search"],
            ["applemusic",  "Apple Music"],
            ["soundcloud",  "SoundCloud"],
            ["instagram",   "Instagram posts"],
            ["tiktok",      "TikTok videos"],
            ["twitter",     "Twitter / X"],
            ["facebook",    "Facebook videos"],
            ["pinterest",   "Pinterest pins"],
            ["gdrive",      "Google Drive"],
            ["mediafire",   "MediaFire"],
            ["terabox",     "Terabox"],
            ["github",      "GitHub repos"],
            ["status",      "Active downloads"],
            ["cancel",      "Cancel download"]
        ]
    },
    search: {
        title: "◈ SEARCH",
        desc: "Find music, movies, images, and more.",
        commands: [
            ["applesearch",     "Search Apple Music"],
            ["spotifysearch",   "Search Spotify"],
            ["youtubesearch",   "Search YouTube"],
            ["pinterestsearch", "Search Pinterest"],
            ["imagesearch",     "Search images"],
            ["lyrics",          "Search lyrics"],
            ["spotifylyric",    "Lyrics via Spotify URL"],
            ["happymod",        "Search APKs"],
            ["whatmusic",       "Identify audio"]
        ]
    },
    ai: {
        title: "◉ AI ASSISTANT",
        desc: "Chat, ask questions, generate images, transcribe voice.",
        commands: [
            ["ai",      "Open AI control center"],
            ["aivoice", "Toggle voice replies"]
        ]
    },
    player: {
        title: "▣ PLAYER",
        desc: "Play and manage audio/video.",
        commands: [
            ["play",  "Play / search audio"],
            ["video", "Send video"],
            ["audio", "Send audio"]
        ]
    },
    profile: {
        title: "★ PROFILE",
        desc: "View your stats and activity.",
        commands: [
            ["profile", "Your stats"],
            ["balance", "Coin balance"],
            ["refer",   "Invite link"]
        ]
    },
    daily: {
        title: "☆ DAILY COINS",
        desc: "Earn free coins every day.",
        commands: [
            ["daily",  "Claim daily reward"],
            ["quiz",   "Answer daily quiz"],
            ["streak", "View streak"]
        ]
    },
    store: {
        title: "★ STORE",
        desc: "Buy coins or unlock premium.",
        commands: [
            ["store", "Open the store"],
            ["buy",   "Manual payment info"]
        ]
    },
    settings: {
        title: "⚙ SETTINGS",
        desc: "Configure your bot experience.",
        commands: [
            ["settings", "Preferences"],
            ["lang",     "Change language"]
        ]
    },
    help: {
        title: "? HELP",
        desc: "Get help using the bot.",
        commands: [
            ["help",  "Command list"],
            ["about", "About BIGSTACK"]
        ]
    },
    report: {
        title: "✗ REPORT",
        desc: "Send a bug report to the owner.",
        commands: [
            ["report", "Report a bug or issue"]
        ]
    }
};

// ══════════════════════════════════════════════════
//  Build category screen
// ══════════════════════════════════════════════════
function buildCategoryScreen(key) {
    const cat = CATEGORIES[key];
    if (!cat) return null;

    const lines = [
        `◈ *${cat.title}*\n`,
        `▸ ${cat.desc}\n`,
        `*Commands*`
    ];

    for (const [cmd, desc] of cat.commands) {
        lines.push(`   ➤ \`/${cmd}\` ⏤ ${desc}`);
    }

    lines.push("");
    lines.push(`▸ ${config.footer}`);

    return lines.join("\n");
}

// ══════════════════════════════════════════════════
//  Back keyboard
// ══════════════════════════════════════════════════
function backKeyboard() {
    return {
        inline_keyboard: [[
            { text: "◀ Back to Menu", callback_data: "menu:home" }
        ]]
    };
}

// ══════════════════════════════════════════════════
//  Home screen
// ══════════════════════════════════════════════════
function buildHomeScreen() {
    return (
        `◈ *BIGSTACK MENU*\n\n` +
        `▸ Pick a category below to explore\n\n` +
        `▸ ${config.footer}`
    );
}

function homeKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "◇ Downloader",   callback_data: "menu:downloader" },
                { text: "◈ Search",       callback_data: "menu:search" }
            ],
            [
                { text: "◉ AI Assistant", callback_data: "menu:ai" },
                { text: "▣ Player",       callback_data: "menu:player" }
            ],
            [
                { text: "★ Profile",      callback_data: "menu:profile" },
                { text: "☆ Daily Coins",  callback_data: "menu:daily" }
            ],
            [
                { text: "★ Store",        callback_data: "menu:store" },
                { text: "⚙ Settings",     callback_data: "menu:settings" }
            ],
            [
                { text: "? Help",         callback_data: "menu:help" },
                { text: "✗ Report",       callback_data: "menu:report" }
            ]
        ]
    };
}

// ══════════════════════════════════════════════════
//  Main middleware
// ══════════════════════════════════════════════════
async function menuHandler(ctx, next) {
    // Only handle callback queries
    if (!ctx.callbackQuery) return next();

    const data = ctx.callbackQuery.data;
    if (!data || !data.startsWith("menu:")) return next();

    const key = data.split(":")[1];

    // ═══════════════════════════════════════════
    //  Home
    // ═══════════════════════════════════════════
    if (key === "home") {
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(buildHomeScreen(), {
                parse_mode: "Markdown",
                reply_markup: homeKeyboard()
            });
        } catch {
            await ctx.reply(buildHomeScreen(), {
                parse_mode: "Markdown",
                reply_markup: homeKeyboard()
            });
        }
        return;
    }

    // ═══════════════════════════════════════════
    //  Store shortcut
    // ═══════════════════════════════════════════
    if (key === "store") {
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(
                `◈ *STORE*\n\n` +
                `▸ Use /store to open the coin shop\n` +
                `▸ Use /buy for mobile money payments\n\n` +
                `▸ ${config.footer}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "◀ Back", callback_data: "menu:home" }
                        ]]
                    }
                }
            );
        } catch {
            await ctx.reply("◈ Use /store to open the shop.");
        }
        return;
    }

    // ═══════════════════════════════════════════
    //  Report shortcut
    // ═══════════════════════════════════════════
    if (key === "report") {
        await ctx.answerCallbackQuery();
        try {
            await ctx.editMessageText(
                `✗ *REPORT A BUG*\n\n` +
                `▸ Use \`/report <issue>\` to send an issue\n\n` +
                `▸ Example\n` +
                `   \`/report /play fails when searching\`\n\n` +
                `▸ Your report goes directly to the owner.\n\n` +
                `▸ ${config.footer}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [[
                            { text: "◀ Back", callback_data: "menu:home" }
                        ]]
                    }
                }
            );
        } catch {}
        return;
    }

    // ═══════════════════════════════════════════
    //  Category
    // ═══════════════════════════════════════════
    const text = buildCategoryScreen(key);
    if (!text) {
        return ctx.answerCallbackQuery({
            text: "Unknown category",
            show_alert: true
        });
    }

    await ctx.answerCallbackQuery();

    try {
        await ctx.editMessageText(text, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard()
        });
    } catch (err) {
        logger.warn(`[menuHandler] edit failed: ${err.message}`);
        await ctx.reply(text, {
            parse_mode: "Markdown",
            reply_markup: backKeyboard()
        });
    }
}

module.exports = menuHandler;