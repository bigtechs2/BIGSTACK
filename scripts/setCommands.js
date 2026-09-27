// ──────────────────────────────────────────────────
//  BIGSTACK — Set Bot Commands
//  Registers all commands with Telegram
//  Run: node scripts/setCommands.js
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

require("dotenv").config();

const { Bot } = require("grammy");
const config = require("../src/config");
const logger = require("../src/core/logger");

// ══════════════════════════════════════════════════
//  Command list
// ══════════════════════════════════════════════════
const COMMANDS = [
    // ─── Utility ──────────────────────────────────
    { command: "start",        description: "Welcome + main menu" },
    { command: "menu",         description: "Show main menu" },
    { command: "help",         description: "Show all commands" },
    { command: "about",        description: "Bot info" },

    // ─── Coins ────────────────────────────────────
    { command: "daily",        description: "Claim daily coins" },
    { command: "balance",      description: "Show coin balance" },
    { command: "profile",      description: "Your stats" },
    { command: "refer",        description: "Invite friends, earn coins" },
    { command: "store",        description: "Buy coins or premium" },
    { command: "buy",          description: "Buy with mobile money" },

    // ─── AI ───────────────────────────────────────
    { command: "ai",           description: "AI assistant (chat, images, voice)" },

    // ─── Downloader ───────────────────────────────
    { command: "play",         description: "YouTube audio search" },
    { command: "ytmp3",        description: "YouTube → MP3" },
    { command: "ytmp4",        description: "YouTube → MP4" },
    { command: "spotify",      description: "Spotify track download" },
    { command: "spotifyplay",  description: "Spotify search" },
    { command: "applemusic",   description: "Apple Music download" },
    { command: "soundcloud",   description: "SoundCloud download" },
    { command: "instagram",    description: "Instagram posts" },
    { command: "tiktok",       description: "TikTok videos" },
    { command: "twitter",      description: "Twitter / X videos" },
    { command: "facebook",     description: "Facebook videos" },
    { command: "pinterest",    description: "Pinterest pins" },
    { command: "gdrive",       description: "Google Drive files" },
    { command: "mediafire",    description: "MediaFire files" },
    { command: "terabox",      description: "Terabox files" },
    { command: "github",       description: "GitHub repositories" },
    { command: "status",       description: "Download status" },
    { command: "cancel",       description: "Cancel download" },

    // ─── Search ───────────────────────────────────
    { command: "applesearch",     description: "Search Apple Music" },
    { command: "spotifysearch",   description: "Search Spotify" },
    { command: "youtubesearch",   description: "Search YouTube" },
    { command: "pinterestsearch", description: "Search Pinterest" },
    { command: "imagesearch",     description: "Search images" },
    { command: "lyrics",          description: "Search lyrics" },
    { command: "spotifylyric",    description: "Lyrics via Spotify URL" },
    { command: "happymod",        description: "Search APKs" },
    { command: "whatmusic",       description: "Identify audio / song" },

    // ─── Admin ────────────────────────────────────
    { command: "stats",        description: "Bot statistics" },
    { command: "pending",      description: "Pending payments" },
    { command: "approve",      description: "Approve payment" },
    { command: "reject",       description: "Reject payment" },
    { command: "ban",          description: "Ban a user" },
    { command: "unban",        description: "Unban a user" }
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
    console.log("Registering commands with Telegram...");
    console.log("─".repeat(50));

    try {
        // ─── Public commands ────────────────────────
        await bot.api.setMyCommands(COMMANDS);
        console.log(`✓ Registered ${COMMANDS.length} public commands`);

        // ─── Admin commands (scope for admins only) ─
        const adminCommands = COMMANDS.filter((c) =>
            ["stats", "pending", "approve", "reject", "ban", "unban", "broadcast"].includes(c.command)
        );

        if (adminCommands.length > 0) {
            // Note: to use admin scope you need chat_id
            // For now, register the same commands everywhere
            // Later you can scope them per-chat via bot.api.setMyCommands(commands, { scope })
            console.log(`✓ ${adminCommands.length} admin commands included`);
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