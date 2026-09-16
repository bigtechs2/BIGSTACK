// ──────────────────────────────────────────────────
//  BIGSTACK — Command Loader
//  © BIGSTACK by bigmanjtech™ with ♥
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const logger = require("./core/logger");

// ─── Main loader ────────────────────────────────────
async function loadCommands(bot) {
    const commandsPath = path.join(__dirname, "commands");
    let totalLoaded = 0;

    // ─── Read categories (player, downloader, search, utility, webapp) ───
    const categories = fs.readdirSync(commandsPath).filter((folder) => {
        return fs.statSync(path.join(commandsPath, folder)).isDirectory();
    });

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);

        // ─── Get all .js files inside this category ───
        const files = fs.readdirSync(categoryPath).filter((file) => {
            return file.endsWith(".js") && file !== "index.js";
        });

        for (const file of files) {
            const filePath = path.join(categoryPath, file);

            try {
                // ─── Delete cache so hot-reload works ───
                delete require.cache[require.resolve(filePath)];

                const command = require(filePath);

                // ─── Validate the command object ───
                if (!command.name || typeof command.code !== "function") {
                    logger.warn(`[Loader] Skipped ${category}/${file}: missing name or code()`);
                    continue;
                }

                // ─── Build trigger list (name + aliases) ───
                const triggers = [command.name, ...(command.aliases || [])];

                // ─── Register with grammY ───
                bot.command(triggers, async (ctx, next) => {
                    // ─── Attach helpers to ctx ───
                    ctx.args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
                    ctx.commandName = command.name;
                    ctx.commandCategory = category;
                    ctx.commandPermissions = command.permissions || {};

                    // ─── Run the command's code ───
                    try {
                        await command.code(ctx, next);
                    } catch (err) {
                        logger.error(`[Cmd:${command.name}]`, err);
                        await ctx.reply("❌ Something went wrong. Try again.").catch(() => {});
                    }
                });

                totalLoaded++;
                logger.info(`[Loader] ✅ ${category}/${command.name} (${triggers.length} trigger${triggers.length > 1 ? "s" : ""})`);

            } catch (err) {
                logger.error(`[Loader] ❌ Failed to load ${category}/${file}:`, err.message);
            }
        }
    }

    logger.info(`[Loader] 🎉 Loaded ${totalLoaded} command${totalLoaded !== 1 ? "s" : ""} total`);
}

// ─── Export ─────────────────────────────────────────
module.exports = { loadCommands };