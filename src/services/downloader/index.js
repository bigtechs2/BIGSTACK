// ──────────────────────────────────────────────────
//  BIGSTACK — Downloader Services Index
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {
    // ─── Music ──────────────────────────────────────
    play:        require("./play.service"),
    ytmp3:       require("./ytmp3.service"),
    spotifyplay: require("./spotifyplay.service"),
    spotify:     require("./spotify.service"),
    applemusic:  require("./applemusic.service"),
    soundcloud:  require("./soundcloud.service"),

    // ─── video export ──────────────────────────────────────
    ytmp4:       require("./ytmp4.service"),

    // ─── Social ─────────────────────────────────────
    instagram:   require("./instagram.service"),
    facebook:    require("./facebook.service"),
    tiktok:      require("./tiktok.service"),
    twitter:     require("./twitter.service"),
    pinterest:   require("./pinterest.service"),

    // ─── File Hosts ─────────────────────────────────
    gdrive:      require("./gdrive.service"),
    mediafire:   require("./mediafire.service"),
    terabox:     require("./terabox.service"),
    github:      require("./github.service")
};