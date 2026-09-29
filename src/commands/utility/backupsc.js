// ──────────────────────────────────────────────────
//  BIGSTACK — /backupsc Command
//  Creates a tar.gz of project source + sends to owner
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { InputFile } = require("grammy");

const config = require("../../../src/config");
const logger = require("../../../src/core/logger");

// ─── Paths ──────────────────────────────────────────
const ROOT = path.resolve(__dirname, "../../../");
const BACKUP_DIR = path.join(ROOT, "downloads/temp");

// ─── Size limit (Telegram standard = 50MB) ──────────
const MAX_SIZE_MB = 45;

// ══════════════════════════════════════════════════
//  Main command
// ══════════════════════════════════════════════════
module.exports = {
    name: "backupsc",
    aliases: ["backup", "bk", "bkup"],
    category: "utility",
    description: "Backup project source code (owner)",
    emoji: "◈",
    usage: "[no arguments]",

    permissions: {
        coin: 0,
        owner: true,
        admin: false,
        premium: false,
        group: false,
        private: true
    },

    code: async (ctx) => {
        const userId = String(ctx.from.id);

        // ─── Plain text (no Markdown) to avoid parsing issues ───
        const loading = await ctx.reply(
            "◐ Creating backup...\n\n" +
            "▸ Zipping project source...\n" +
            "▸ Excluding node_modules, logs, downloads"
        );

        // ─── Ensure temp dir exists ────────────────
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        // ─── Build filename ────────────────────────
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .slice(0, 19);
        const filename = `bigstack-backup-${timestamp}.tar.gz`;
        const filePath = path.join(BACKUP_DIR, filename);

        logger.info(`[/backupsc] ${userId} started backup`);

        try {
            // ═══════════════════════════════════════
            //  1. Create tar.gz archive
            // ═══════════════════════════════════════
            const tarCommand = [
                "tar",
                "-czf",
                `"${filePath}"`,
                "--exclude=node_modules",
                "--exclude=.git",
                "--exclude=downloads",
                "--exclude=logs",
                "--exclude=.env",
                "--exclude=*.log",
                "--exclude=tmp",
                "--exclude=test-*",
                "--exclude=*.mp3",
                "--exclude=*.mp4",
                "--exclude=*.tar.gz",
                "-C",
                `"${ROOT}"`,
                "."
            ].join(" ");

            await new Promise((resolve, reject) => {
                exec(tarCommand, { timeout: 120000 }, (err) => {
                    if (err) {
                        logger.error(`[/backupsc] tar failed: ${err.message}`);
                        reject(new Error("Failed to create archive"));
                    } else {
                        resolve();
                    }
                });
            });

            // ═══════════════════════════════════════
            //  2. Check size
            // ═══════════════════════════════════════
            const stats = fs.statSync(filePath);
            const sizeMB = stats.size / (1024 * 1024);
            const sizeFormatted = sizeMB.toFixed(2) + " MB";

            logger.info(`[/backupsc] archive created: ${sizeFormatted}`);

            // ─── Too large ─────────────────────────
            if (sizeMB > MAX_SIZE_MB) {
                await ctx.api.editMessageText(
                    ctx.chat.id,
                    loading.message_id,
                    `⚠ Backup too large\n\n` +
                    `▸ Size    ➤ ${sizeFormatted}\n` +
                    `▸ Limit   ➤ ${MAX_SIZE_MB} MB\n\n` +
                    `▸ Download manually:\n` +
                    `   scp ubuntu@3.253.105.255:${filePath} .`
                );

                logger.warn(`[/backupsc] archive too large: ${sizeFormatted}`);
                return;
            }

            // ═══════════════════════════════════════
            //  3. Send to owner
            // ═══════════════════════════════════════
            const caption =
                `◈ BACKUP COMPLETE\n\n` +
                `▸ File     ➤ ${filename}\n` +
                `▸ Size     ➤ ${sizeFormatted}\n` +
                `▸ Created  ➤ ${new Date().toLocaleString("en-GB", { hour12: false })}\n\n` +
                `▸ Contains source code only\n` +
                `▸ Excludes: node_modules, logs, downloads, .env\n\n` +
                `▸ ${config.footer}`;

            const ownerId = config.ownerId || process.env.OWNER_ID;

            await ctx.api.sendDocument(
                ownerId,
                new InputFile(filePath, filename),
                { caption }
            );

            // ─── Confirm to current chat ───────────
            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `✓ Backup sent to owner\n\n` +
                `▸ File  ➤ ${filename}\n` +
                `▸ Size  ➤ ${sizeFormatted}`
            );

            logger.info(`[/backupsc] ✓ backup sent to owner`);

        } catch (err) {
            logger.error(`[/backupsc] failed: ${err.message}`);

            await ctx.api.editMessageText(
                ctx.chat.id,
                loading.message_id,
                `✗ Backup failed\n\n▸ Reason: ${err.message}`
            ).catch(() => {});

        } finally {
            // ─── Cleanup temp file after 60s ───────
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        logger.info(`[/backupsc] cleaned up temp archive`);
                    }
                } catch (e) {
                    logger.warn(`[/backupsc] cleanup failed: ${e.message}`);
                }
            }, 60000);
        }
    }
};
