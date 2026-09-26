// ──────────────────────────────────────────────────
//  BIGSTACK — File Helpers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("../core/logger");

const TEMP_DIR = path.resolve(__dirname, "../../downloads/temp");

// Ensure temp folder exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ══════════════════════════════════════════════════
//  Download a file from Telegram by file_id
// ══════════════════════════════════════════════════
async function downloadTelegramFile(ctx, fileId, extension = "ogg") {
    try {
        const file = await ctx.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

        const filename = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
        const filePath = path.join(TEMP_DIR, filename);

        const { data } = await axios.get(fileUrl, {
            responseType: "stream",
            timeout: 60000
        });

        const writer = fs.createWriteStream(filePath);
        data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        logger.info(`[fileHelpers] downloaded ${filename}`);
        return filePath;

    } catch (err) {
        logger.error(`[fileHelpers] download failed: ${err.message}`);
        throw err;
    }
}

// ══════════════════════════════════════════════════
//  Delete a temp file
// ══════════════════════════════════════════════════
function deleteFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        logger.warn(`[fileHelpers] delete failed: ${err.message}`);
    }
}

module.exports = { downloadTelegramFile, deleteFile, TEMP_DIR };