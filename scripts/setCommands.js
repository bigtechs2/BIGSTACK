// ──────────────────────────────────────────────────
//  BIGSTACK — Set Bot Commands
//  Registers ALL 46 commands with Telegram
//  Run: npm run setcommands
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

require("dotenv").config();

const { Bot } = require("grammy");
const logger = require("../src/core/logger");

// ══════════════════════════════════════════════════
//  FULL COMMAND LIST
// ══════════════════════════════════════════════════
const COMMANDS = [
    // ─── Core ─────────────────────────────────────
    { command: "start",         description: "Welcome + main menu" },
    { command: "menu",          description: "Show main menu" },
    { command: "help",          description: "Show all commands" },
    { command: "about",         description: "Bot info" },

    // ─── Downloader ───────────────────────────────
    { command: "play",          description: "YouTube audio search" },
    { command: "ytmp3",         description: "YouTube → MP3" },
    { command: "ytmp4",         description: "YouTube → MP4" },
    { command: "spotify",       description: "Spotify track download" },
    { command: "spotifyplay",   description: "Spotify search" },
    { command: "applemusic",    description: "Apple Music download" },
    { command: "soundcloud",    description: "SoundCloud download" },
    { command: "instagram",     description: "Instagram posts" },
    { command: "tiktok",        description: "TikTok videos" },
    { command: "twitter",       description: "Twitter / X videos" },
    { command: "facebook",      description: "Facebook videos" },
    { command: "pinterest",     description: "Pinterest pins" },
    { command: "gdrive",        description: "Google Drive files" },
    { command: "mediafire",     description: "MediaFire files" },
    { command: "terabox",       description: "Terabox files" },
    { command: "github",        description: "GitHub repositories" },
    { command: "status",        description: "Download status" },
    { command: "cancel",        description: "Cancel download" },

    // ─── Search ───────────────────────────────────
    { command: "applesearch",   description: "Search Apple Music" },
    { command: "spotifysearch", description: "Search Spotify" },
    { command: "youtubesearch", description: "Search YouTube" },
    { command: "pinterestsearch", description: "Search Pinterest" },
    { command: "imagesearch",   description: "Search images" },
    { command: "lyrics",        description: "Search lyrics" },
    { command: "spotifylyric",  description: "Lyrics via Spotify URL" },
    { command: "happymod",      description: "Search APKs" },
    { command: "whatmusic",     description: "Identify audio / song" },

    // ─── Economy ──────────────────────────────────
    { command: "balance",       description: "Show coin balance" },
    { command: "daily",         description: "Claim daily coins" },
    { command: "refer",         description: "Invite friends, earn coins" },
    { command: "profile",       description: "Your stats" },
    { command: "store",         description: "Buy coins or premium" },
    { command: "buy",           description: "Buy with mobile money" },

    // ─── AI ───────────────────────────────────────
    { command: "ai",            description: "AI assistant control center" },
    { command: "aivoice",       description: "Toggle voice replies" },

    // ─── Settings ─────────────────────────────────
    { command: "settings",      description: "Configure your preferences" },
    { command: "lang",          description: "Change language" },
    { command: "verify",        description: "Verify channel joins" },

    // ─── System ───────────────────────────────────
    { command: "ping",          description: "Bot latency" },
    { command: "alive",         description: "Uptime check" },
    { command: "runtime",       description: "System stats" },
    { command: "report",        description: "Report a bug" }
];

// ══════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════
async function main() {
    if (!process.env.BOT_TOKEN) {
        console.error("✗ BOT_TOKEN missing in .env");
        process.exit(1);
    }

    const bot = new Bot(process.env.BOT_TOKEN);

    console.log("─".repeat(50));
    console.log(`Registering ${COMMANDS.length} commands...`);
    console.log("─".repeat(50));

    try {
        // ─── Default scope (everyone) ───────────────
        await bot.api.setMyCommands(COMMANDS);
        console.log(`✓ Registered ${COMMANDS.length} public commands`);

        // ─── Owner-only commands (hidden from normal users)
        const ownerCommands = [
            { command: "addcmd",    description: "Add a custom command" },
            { command: "testcmd",   description: "Test a custom command" },
            { command: "execute",   description: "Execute code (owner)" },
            { command: "backupsc",  description: "Backup session" }
        ];

        if (process.env.OWNER_ID) {
            try {
                await bot.api.setMyCommands(
                    [...COMMANDS, ...ownerCommands],
                    { scope: { type: "chat", chat_id: Number(process.env.OWNER_ID) } }
                );
                console.log(`✓ Registered ${ownerCommands.length} owner commands`);
            } catch (e) {
                console.log(`⚠ Owner commands failed: ${e.message}`);
            }
        }

        console.log("─".repeat(50));
        console.log("✓ Done. Check your bot in Telegram.");
        console.log("─".repeat(50));

        process.exit(0);

    } catch (err) {
        console.error(`✗ Failed: ${err.message}`);
        process.exit(1);
    }
}

main();