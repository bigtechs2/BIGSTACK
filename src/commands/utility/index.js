// ──────────────────────────────────────────────────
//  BIGSTACK — Utility Commands Index
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const { ban, unban } = require("./ban");
const { pending, approve, reject } = require("./approve");

module.exports = {
    // ─── Core ───────────────────────────────────────
    start: require("./start"),
    menu: require("./menu"),
    help: require("./help"),
    about: require("./about"),

    // ─── Economy ────────────────────────────────────
    balance: require("./balance"),
    daily: require("./daily"),
    refer: require("./refer"),
    profile: require("./profile"),
    store: require("./store"),
    buy: require("./buy"),

    // ─── Settings ───────────────────────────────────
    settings: require("./settings"),
    verify: require("./verify"),

    // ─── AI ─────────────────────────────────────────
    ai: require("./ai"),

    // ─── Reports ────────────────────────────────────
    report: require("./report"),
    reply: require("./reply"),

    // ─── Owner Tools ────────────────────────────────
    addcmd: require("./addcmd"),
    testcmd: require("./testcmd"),
    execute: require("./execute"),

    // ─── Admin ──────────────────────────────────────
    stats: require("./stats"),
    broadcast: require("./broadcast"),
    pending,
    approve,
    reject,
    ban,
    unban
};