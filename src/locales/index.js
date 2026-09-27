// ──────────────────────────────────────────────────
//  BIGSTACK — Locale Loader
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const config = require("../config");

// ══════════════════════════════════════════════════
//  Load all locale files
// ══════════════════════════════════════════════════
const locales = {};
const localesDir = __dirname;

const files = fs.readdirSync(localesDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
    const code = file.replace(".json", "");
    try {
        locales[code] = require(path.join(localesDir, file));
    } catch (err) {
        console.warn(`[locales] failed to load ${file}: ${err.message}`);
    }
}

// ─── Default language ───────────────────────────────
const DEFAULT_LANG = config.locales?.default || "en";

// ══════════════════════════════════════════════════
//  Get nested value by path
// ══════════════════════════════════════════════════
function getValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

// ══════════════════════════════════════════════════
//  Translate function
// ══════════════════════════════════════════════════
function t(key, variables = {}, lang = null) {
    const language = lang || DEFAULT_LANG;

    // ─── Try requested language ─────────────────────
    let value = getValue(locales[language], key);

    // ─── Fallback to default ────────────────────────
    if (value === undefined) {
        value = getValue(locales[DEFAULT_LANG], key);
    }

    // ─── Fallback to key itself ─────────────────────
    if (value === undefined) {
        return key;
    }

    // ─── Replace variables ──────────────────────────
    if (typeof value === "string") {
        return value.replace(/\{(\w+)\}/g, (_, name) =>
            variables[name] !== undefined ? variables[name] : `{${name}}`
        );
    }

    return value;
}

// ══════════════════════════════════════════════════
//  Check if language is supported
// ══════════════════════════════════════════════════
function isSupported(lang) {
    return Object.keys(locales).includes(lang);
}

// ══════════════════════════════════════════════════
//  Get list of available languages
// ══════════════════════════════════════════════════
function getAvailable() {
    return Object.keys(locales);
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    t,
    isSupported,
    getAvailable,
    locales
};