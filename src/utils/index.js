// ──────────────────────────────────────────────────
//  BIGSTACK — Utils Index
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Central export for all utility modules.
//  Commands import from here:
//    const { startProgress } = require("../../utils");
//
//  Or import directly:
//    const { startProgress } = require("../../utils/progress");
// ──────────────────────────────────────────────────

// ═══════════════════════════════════════════════
//  Live progress
// ═══════════════════════════════════════════════
const progress = require("./progress");

// ═══════════════════════════════════════════════
//  Available utilities
// ═══════════════════════════════════════════════
// As you build more helpers, add them here.
//
// Planned:
//   const formatters = require("./formatters");   // bytes, duration, etc.
//   const validators = require("./validators");   // URL, query checks
//   const keyboard = require("./keyboard");       // inline button builders
//   const pagination = require("./pagination");   // multi-page lists
//   const mediaInfo = require("./mediaInfo");     // extract metadata
//   const urlParser = require("./urlParser");     // URL helpers
//   const tempCleaner = require("./tempCleaner"); // old file cleanup
//   const footer = require("./footer");           // branded footer

// ═══════════════════════════════════════════════
//  Export everything
// ═══════════════════════════════════════════════
module.exports = {
    // ─── Live progress ──────────────────────────
    startProgress: progress.startProgress,
    formatElapsed: progress.formatElapsed

    // ─── Add more as you build them ─────────────
    // ...formatters,
    // ...validators,
    // ...keyboard,
    // ...pagination,
    // ...mediaInfo,
    // ...urlParser,
    // ...tempCleaner,
    // ...footer
};