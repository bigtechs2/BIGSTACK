// ──────────────────────────────────────────────────
//  BIGSTACK — Command Manager Service
//  Validates, writes, and reloads commands
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { exec } = require("child_process");
const logger = require("../../core/logger");

// ─── Paths ──────────────────────────────────────────
const COMMANDS_DIR = path.resolve(__dirname, "../../commands");

// ─── Allowed categories ─────────────────────────────
const ALLOWED_CATEGORIES = [
    "downloader",
    "search",
    "player",
    "utility",
    "webapp"
];

// ══════════════════════════════════════════════════
//  VALIDATE SCRIPT
// ══════════════════════════════════════════════════
function validateScript(rawText) {
    if (!rawText || typeof rawText !== "string") {
        return { valid: false, reason: "Empty script" };
    }

    // ─── Strip markdown code fences ─────────────────
    let clean = rawText.trim();
    clean = clean.replace(/^```(?:js|javascript)?\s*\n?/i, "");
    clean = clean.replace(/\n?```\s*$/, "");
    clean = clean.trim();

    // ─── 1. Syntax check ────────────────────────────
    try {
        new vm.Script(clean);
    } catch (e) {
        return { valid: false, reason: `Syntax error: ${e.message}` };
    }

    // ─── 2. Must have module.exports ────────────────
    if (!/module\.exports\s*=\s*\{/.test(clean)) {
        return {
            valid: false,
            reason: "Missing `module.exports = { ... }`"
        };
    }

    // ─── 3. Extract name ────────────────────────────
    const nameMatch = clean.match(
        /name\s*:\s*["'`]([a-z0-9_-]+)["'`]/i
    );
    if (!nameMatch) {
        return { valid: false, reason: "Missing or invalid `name` field" };
    }
    const name = nameMatch[1].toLowerCase();

    // ─── 4. Extract category ────────────────────────
    const categoryMatch = clean.match(
        /category\s*:\s*["'`]([a-z]+)["'`]/i
    );
    const category = categoryMatch
        ? categoryMatch[1].toLowerCase()
        : "utility";

    if (!ALLOWED_CATEGORIES.includes(category)) {
        return {
            valid: false,
            reason: `Unknown category "${category}". Allowed: ${ALLOWED_CATEGORIES.join(", ")}`
        };
    }

    // ─── 5. Extract aliases ─────────────────────────
    const aliasesMatch = clean.match(/aliases\s*:\s*\[([^\]]*)\]/);
    const aliases = aliasesMatch
        ? aliasesMatch[1]
              .split(",")
              .map((s) => s.trim().replace(/["'`]/g, ""))
              .filter(Boolean)
        : [];

    // ─── 6. Extract description ─────────────────────
    const descMatch = clean.match(
        /description\s*:\s*["'`]([^"'`]+)["'`]/
    );
    const description = descMatch ? descMatch[1] : "No description";

    // ─── 7. Must have code function ─────────────────
    if (!/code\s*:\s*(async\s*)?(\(|function)/.test(clean)) {
        return { valid: false, reason: "Missing `code` function" };
    }

    // ─── 8. Duplicate check ─────────────────────────
    const filePath = path.join(COMMANDS_DIR, category, `${name}.js`);
    if (fs.existsSync(filePath)) {
        return {
            valid: false,
            reason: `Command "/${name}" already exists in "${category}"`
        };
    }

    // ─── 9. Reserved names ──────────────────────────
    const reserved = ["addcmd", "execute", "testcmd", "cancel"];
    if (reserved.includes(name)) {
        return {
            valid: false,
            reason: `"${name}" is a reserved name`
        };
    }

    return {
        valid: true,
        clean,
        metadata: {
            name,
            category,
            aliases,
            description,
            filePath
        }
    };
}

// ══════════════════════════════════════════════════
//  WRITE COMMAND FILE
// ══════════════════════════════════════════════════
function writeCommand(metadata, cleanCode) {
    const folder = path.dirname(metadata.filePath);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
    fs.writeFileSync(metadata.filePath, cleanCode, "utf8");
    logger.info(`[cmdManager] wrote ${metadata.filePath}`);
    return metadata.filePath;
}

// ══════════════════════════════════════════════════
//  DELETE COMMAND
// ══════════════════════════════════════════════════
function deleteCommand(category, name) {
    const filePath = path.join(COMMANDS_DIR, category, `${name}.js`);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`[cmdManager] deleted ${filePath}`);
        return true;
    }
    return false;
}

// ══════════════════════════════════════════════════
//  LIST ALL COMMANDS
// ══════════════════════════════════════════════════
function listCommands() {
    const list = [];

    for (const category of ALLOWED_CATEGORIES) {
        const folder = path.join(COMMANDS_DIR, category);
        if (!fs.existsSync(folder)) continue;

        const files = fs
            .readdirSync(folder)
            .filter((f) => f.endsWith(".js") && f !== "index.js");

        for (const file of files) {
            list.push({
                category,
                file,
                name: file.replace(".js", ""),
                fullPath: path.join(folder, file)
            });
        }
    }

    return list;
}

// ══════════════════════════════════════════════════
//  RESTART PM2
// ══════════════════════════════════════════════════
function restartPM2() {
    return new Promise((resolve, reject) => {
        exec(
            "pm2 restart bigstack",
            { timeout: 30000 },
            (err, stdout, stderr) => {
                if (err) return reject(err);
                resolve({ stdout, stderr });
            }
        );
    });
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    validateScript,
    writeCommand,
    deleteCommand,
    listCommands,
    restartPM2,
    ALLOWED_CATEGORIES,
    COMMANDS_DIR
};