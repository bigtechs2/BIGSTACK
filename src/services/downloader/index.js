// ──────────────────────────────────────────────────
//  BIGSTACK — Downloader Services Index
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Central hub for all downloader services.
//  Every command imports from here:
//    const services = require("../../services/downloader");
//    await services.play.search("faded");
//    await services.ytmp3.download(url);
// ──────────────────────────────────────────────────

// ══════════════════════════════════════════════════
//  🎵  MUSIC SERVICES
// ══════════════════════════════════════════════════

const play = require("./play.service");
const ytmp3 = require("./ytmp3.service");
const spotifyplay = require("./spotifyplay.service");
const spotify = require("./spotify.service");
const applemusic = require("./applemusic.service");
const soundcloud = require("./soundcloud.service");

// ══════════════════════════════════════════════════
//  🎬  VIDEO SERVICES
// ══════════════════════════════════════════════════

const ytmp4 = require("./ytmp4.service");

// ══════════════════════════════════════════════════
//  📱  SOCIAL MEDIA SERVICES
// ══════════════════════════════════════════════════

const instagram = require("./instagram.service");
const facebook = require("./facebook.service");
const tiktok = require("./tiktok.service");
const twitter = require("./twitter.service");
const pinterest = require("./pinterest.service");

// ══════════════════════════════════════════════════
//  📦  FILE HOSTS & CLOUD STORAGE
// ══════════════════════════════════════════════════

const gdrive = require("./gdrive.service");
const mediafire = require("./mediafire.service");
const terabox = require("./terabox.service");
const github = require("./github.service");

// ══════════════════════════════════════════════════
//  🌟  UNIVERSAL DOWNLOADER (auto-detect)
// ══════════════════════════════════════════════════

// const dl = require("./dl.service");  // ⏳ Build later

// ══════════════════════════════════════════════════
//  🛠️  HELPERS
// ══════════════════════════════════════════════════

const detectSite = require("./detectSite");  // ⏳ Build later (optional)

// ══════════════════════════════════════════════════
//  📦 EXPORT
// ══════════════════════════════════════════════════

module.exports = {
    // ─── Music ──────────────────────────────────────
    play,
    ytmp3,
    spotifyplay,
    spotify,
    applemusic,
    soundcloud,

    // ─── Video ──────────────────────────────────────
    ytmp4,

    // ─── Social Media ───────────────────────────────
    instagram,
    facebook,
    tiktok,
    twitter,
    pinterest,

    // ─── File Hosts & Cloud ─────────────────────────
    gdrive,
    mediafire,
    terabox,
    github

    // ─── Universal ──────────────────────────────────
    // dl,

    // ─── Helpers ────────────────────────────────────
    // detectSite
};