// ──────────────────────────────────────────────────
//  BIGSTACK — Command Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Reads every command file, registers with grammY,
//  and forwards activity to the ACTIVITY group
//  automatically.
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const logger = require("./core/logger");
const config = require("./config");

// ─── Activity forwarder (optional) ──────────────────
let activityForwarder = null;
try {
    activityForwarder = require("./core/activityForwarder");
} catch {
    logger.warn("[Loader] activityForwarder not found — activity forwarding disabled");
}

// ─── Categories counted as "downloads" ──────────────
const DOWNLOAD_CATEGORIES = ["downloader"];

// ══════════════════════════════════════════════════
//  Main loader
// ══════════════════════════════════════════════════
async function loadCommands(bot) {
    const commandsPath = path.join(__dirname, "commands");
    let totalLoaded = 0;

    // ─── Read categories ────────────────────────────
    const categories = fs.readdirSync(commandsPath).filter((folder) => {
        return fs.statSync(path.join(commandsPath, folder)).isDirectory();
    });

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);

        // ─── Get all .js files inside category ──────
        const files = fs.readdirSync(categoryPath).filter((file) => {
            return file.endsWith(".js") && file !== "index.js";
        });

        for (const file of files) {
            const filePath = path.join(categoryPath, file);

            try {
                // ─── Delete cache so hot-reload works ───
                delete require.cache[require.resolve(filePath)];

                const command = require(filePath);

                // ─── Validate command object ─────────
                if (!command.name || typeof command.code !== "function") {
                    logger.warn(`[Loader] Skipped ${category}/${file}: missing name or code()`);
                    continue;
                }

                // ─── Build trigger list ──────────────
                const triggers = [command.name, ...(command.aliases || [])];

                // ─── Register with grammY ────────────
                bot.command(triggers, async (ctx, next) => {
                    // ─── Attach helpers to ctx ───────
                    ctx.args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
                    ctx.commandName = command.name;
                    ctx.commandCategory = category;
                    ctx.commandPermissions = command.permissions || {};
                    ctx.progressProvider = null;

                    const startTime = Date.now();
                    let success = true;
                    let errorCaught = null;

                    try {
                        await command.code(ctx, next);
                    } catch (err) {
                        success = false;
                        errorCaught = err;
                        logger.error(`[Cmd:${command.name}]`, err);
                        await ctx
                            .reply("✗  Something went wrong. Try again.")
                            .catch(() => {});
                        throw err;
                    } finally {
                        // ═══════════════════════════════════
                        //  AUTO ACTIVITY FORWARDING
                        // ═══════════════════════════════════
                        forwardActivity(ctx, {
                            success,
                            error: errorCaught,
                            durationMs: Date.now() - startTime,
                            category
                        });
                    }
                });

                totalLoaded++;
                logger.info(
                    `[Loader] ✓ ${category}/${command.name} (${triggers.length} trigger${
                        triggers.length > 1 ? "s" : ""
                    })`
                );
            } catch (err) {
                logger.error(`[Loader] ✗ Failed to load ${category}/${file}: ${err.message}`);
            }
        }
    }

    logger.info(
        `[Loader] ✓ Loaded ${totalLoaded} command${totalLoaded !== 1 ? "s" : ""} total`
    );
}

// ══════════════════════════════════════════════════
//  Activity forwarding
// ══════════════════════════════════════════════════
function forwardActivity(ctx, { success, error, durationMs, category }) {
    // ─── Skip if forwarder missing ──────────────────
    if (!activityForwarder) return;

    // ─── Skip if user unknown ───────────────────────
    if (!ctx.from) return;

    // ─── Skip bots ──────────────────────────────────
    if (ctx.from.is_bot) return;

    const isDownloader = DOWNLOAD_CATEGORIES.includes(category);

    // ═══════════════════════════════════════════════
    //  Downloader commands → "download" event
    // ═══════════════════════════════════════════════
    if (isDownloader) {
        activityForwarder
            .download(ctx, {
                command: ctx.commandName,
                provider: ctx.progressProvider || "unknown",
                duration: formatDuration(durationMs),
                status: success ? "✓ Success" : "✗ Failed"
            })
            .catch(() => {});
        return;
    }

    // ═══════════════════════════════════════════════
    //  Other commands → only if enabled in config
    // ═══════════════════════════════════════════════
    const sendCommands = config.logging?.groups?.activity?.sendCommands === true;
    if (!sendCommands) return;

    activityForwarder.command(ctx).catch(() => {});
}

// ─── Format duration ────────────────────────────────
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

// ─── Export ─────────────────────────────────────────
module.exports = { loadCommands };