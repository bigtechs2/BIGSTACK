// ──────────────────────────────────────────────────
//  BIGSTACK — Branding & Config Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

// ─── Path to config.json (in project root) ──────────
const configPath = path.resolve(__dirname, "../../config.json");

// ─── Check if config.json exists ────────────────────
if (!fs.existsSync(configPath)) {
    console.error(chalk.red("\n❌ config.json is missing in the root folder.\n"));
    process.exit(1);
}

// ─── Try to parse it ────────────────────────────────
let branding;

try {
    const raw = fs.readFileSync(configPath, "utf8");
    branding = JSON.parse(raw);
} catch (err) {
    console.error(chalk.red("\n❌ config.json has invalid JSON format:"));
    console.error(chalk.red(`   ${err.message}\n`));
    console.error(chalk.yellow("💡 Tip: Check for missing commas or quotes.\n"));
    process.exit(1);
}

// ─── Quick sanity check ─────────────────────────────
if (!branding.branding || !branding.bot || !branding.owner) {
    console.error(chalk.red("\n❌ config.json is missing essential sections:"));
    console.error(chalk.red("   Required: branding, bot, owner\n"));
    process.exit(1);
}

// ─── Export ─────────────────────────────────────────
module.exports = branding;