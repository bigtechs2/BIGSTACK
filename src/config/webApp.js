// ──────────────────────────────────────────────────
//  BIGSTACK — WebApp (Mini App) Helper
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const env = require("./env");
const branding = require("./branding");

// ─── Get raw config ─────────────────────────────────
const raw = branding.webapp || {
    enabled: false,
    title: "BIGSTACK",
    shortName: "bigstack",
    themeColor: "#0f0f0f",
    backgroundColor: "#ffffff",
    path: "/webapp"
};

// ─── STATUS ─────────────────────────────────────────

/**
 * Is the Mini App enabled AND configured with a URL?
 */
function isEnabled() {
    return raw.enabled === true && !!env.webappUrl;
}

// ─── GETTERS ────────────────────────────────────────

function getTitle() {
    return raw.title || "BIGSTACK";
}

function getShortName() {
    return raw.shortName || "bigstack";
}

function getThemeColor() {
    return raw.themeColor || "#0f0f0f";
}

function getBackgroundColor() {
    return raw.backgroundColor || "#ffffff";
}

function getPath() {
    return raw.path || "/webapp";
}

/**
 * Full URL to the Mini App
 * Example: https://bigstack.vercel.app/webapp
 */
function getUrl() {
    if (!env.webappUrl) return null;
    const base = env.webappUrl.replace(/\/+$/, "");  // strip trailing slashes
    const path = getPath().replace(/^\/+/, "");       // strip leading slashes
    return `${base}/${path}`;
}

/**
 * Base API URL — where the Mini App sends API requests
 * Example: https://bigstack-bot.onrender.com/api
 */
function getApiUrl() {
    if (!env.webappUrl) return null;
    const base = env.webappUrl.replace(/\/+$/, "");
    return `${base}/api`;
}

// ─── BUTTON BUILDER ─────────────────────────────────

/**
 * Build the inline button that opens the Mini App
 * @param {string} text - Button label
 * @param {string} [path] - Optional path (e.g., "/profile")
 */
function buildButton(text = "🚀 Open BIGSTACK", path = "") {
    if (!isEnabled()) return null;

    const url = path
        ? `${getUrl().replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
        : getUrl();

    return {
        text,
        web_app: { url }
    };
}

/**
 * Build a full inline keyboard with Mini App button
 */
function buildKeyboard(text = "🚀 Open BIGSTACK", path = "") {
    const button = buildButton(text, path);
    if (!button) return null;

    return {
        inline_keyboard: [[button]]
    };
}

// ─── THEME ──────────────────────────────────────────

/**
 * Theme data to inject into the Mini App
 */
function getTheme() {
    return {
        title: getTitle(),
        shortName: getShortName(),
        themeColor: getThemeColor(),
        backgroundColor: getBackgroundColor(),
        botUsername: branding.bot?.username || ""
    };
}

// ─── INIT DATA VALIDATION ───────────────────────────
// (Logic lives in services/webapp/initData.service.js,
//  but the secret comes from here)

function getSecret() {
    return env.botToken;
}

function getJwtSecret() {
    return env.jwtSecret;
}

// ─── EXPORT ─────────────────────────────────────────
module.exports = {
    // Raw
    raw,

    // Status
    isEnabled,

    // Getters
    getTitle,
    getShortName,
    getThemeColor,
    getBackgroundColor,
    getPath,
    getUrl,
    getApiUrl,

    // Builders
    buildButton,
    buildKeyboard,
    getTheme,

    // Secrets
    getSecret,
    getJwtSecret
};