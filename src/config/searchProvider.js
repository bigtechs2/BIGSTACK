// ──────────────────────────────────────────────────
//  BIGSTACK — Search API Providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {

    // ═════════════════════════════════════════════
    //  APPLESEARCH — Search Apple Music
    // ═════════════════════════════════════════════
    applesearch: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/applemusic",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "zellrayy"
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/applemusic",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "nexray"
        }
    ],

    // ═════════════════════════════════════════════
    //  IMAGESEARCH — Search web for images
    // ═════════════════════════════════════════════
    imagesearch: [
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/bingimage",
            method: "GET",
            param: "q",
            timeout: 20000,
            enabled: true,
            shape: "nexray"
        }
    ],

    // ═════════════════════════════════════════════
    //  LYRICS — Search song lyrics
    // ═════════════════════════════════════════════
    lyrics: [
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/lyrics",
            method: "GET",
            param: "q",
            timeout: 20000,
            enabled: true,
            shape: "nexray"
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/lirik",
            method: "GET",
            param: "q",
            timeout: 20000,
            enabled: true,
            shape: "zellrayy"
        }
    ],

    // ═════════════════════════════════════════════
    //  SPOTIFYLYRIC — Search lyrics by Spotify URL
    // ═════════════════════════════════════════════
    spotifylyric: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/lirik-spotify",
            method: "GET",
            param: "url",
            timeout: 20000,
            enabled: true,
            shape: "zellrayy"
        }
    ],

    // ═════════════════════════════════════════════
    //  HAPPYMOD — Search HappyMod for APKs
    // ═════════════════════════════════════════════
    happymod: [
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/happymood",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "nexray"
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/search/happymod",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "azbry"
        }
    ],

    // ═════════════════════════════════════════════
    //  SPOTIFYSEARCH — Search Spotify tracks
    // ═════════════════════════════════════════════
    spotifysearch: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/spotify",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "zellrayy"
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/spotify",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "nexray"
        }
    ],

    // ═════════════════════════════════════════════
    //  PINTERESTSEARCH — Search Pinterest pins
    // ═════════════════════════════════════════════
    pinterestsearch: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/pinterest",
            method: "GET",
            param: "q",
            extraParams: { limit: 15, scope: "pins" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy"
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/pinterest",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "nexray"
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/search/pinterest",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "azbry"
        },
        {
            name: "neoapis",
            url: "https://www.neoapis.xyz/api/search/pinterest",
            method: "GET",
            param: "query",
            timeout: 30000,
            enabled: true,
            shape: "neoapis"
        },
        {
            name: "davidcyril",
            url: "https://apis.davidcyriltech.my.id/search/pinterest",
            method: "GET",
            param: "text",
            timeout: 30000,
            enabled: true,
            shape: "davidcyril"
        }
    ],

    // ═════════════════════════════════════════════
    //  YOUTUBESEARCH — Search YouTube videos
    // ═════════════════════════════════════════════
    youtubesearch: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/search/youtube",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "zellrayy"
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/search/youtube",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "nexray"
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/search/yts",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "azbry"
        }
    ],

    // ═════════════════════════════════════════════
    //  OTHER SEARCH COMMANDS ⏤ add later
    // ═════════════════════════════════════════════
    search: [],
    anime: [],
    movie: [],
    tv: [],
    song: [],
    manga: [],
    image: []

};