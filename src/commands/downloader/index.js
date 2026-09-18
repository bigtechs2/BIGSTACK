// ──────────────────────────────────────────────────
//  BIGSTACK — Downloader Commands Index
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  This file lists all downloader commands.
//  The loader reads this to know what to register.
//  ⚠️ Not used as a middleware — just a manifest.
// ──────────────────────────────────────────────────

module.exports = {
    // ═════════════════════════════════════════════
    //  🌟 UNIVERSAL (auto-detect)
    // ═════════════════════════════════════════════
    dl: require("./dl"),

    // ═════════════════════════════════════════════
    //  🎵 MUSIC
    // ═════════════════════════════════════════════
    play: require("./play"),
    ytmp3: require("./ytmp3"),
    spotifyplay: require("./spotifyplay"),
    spotify: require("./spotify"),
    applemusic: require("./applemusic"),
    soundcloud: require("./soundcloud"),

    // ═════════════════════════════════════════════
    //  🎬 VIDEO
    // ═════════════════════════════════════════════
    ytmp4: require("./ytmp4"),

    // ═════════════════════════════════════════════
    //  📱 SOCIAL MEDIA
    // ═════════════════════════════════════════════
    instagram: require("./instagram"),
    facebook: require("./facebook"),
    tiktok: require("./tiktok"),
    twitter: require("./twitter"),
    pinterest: require("./pinterest"),

    // ═════════════════════════════════════════════
    //  📦 FILE HOSTS & CLOUD
    // ═════════════════════════════════════════════
    gdrive: require("./gdrive"),
    mediafire: require("./mediafire"),
    terabox: require("./terabox"),
    github: require("./github"),

    // ═════════════════════════════════════════════
    //  🛠️ UTILITY
    // ═════════════════════════════════════════════
    status: require("./status"),
    cancel: require("./cancel")
};