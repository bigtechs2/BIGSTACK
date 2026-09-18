// ──────────────────────────────────────────────────
//  BIGSTACK — API Providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  HOW TO USE:
//  - Each array = providers tried in ORDER (top to bottom)
//  - First success wins. Others are skipped.
//  - Set "enabled: false" to disable temporarily.
//  - "fields" tells the service where to find data
//    in each provider's response.
//  - "shape" marks providers needing custom normalizers.
// ──────────────────────────────────────────────────

module.exports = {

    // ═════════════════════════════════════════════
    //  🎵  MUSIC — SEARCH BY NAME
    // ═════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  🎵 PLAY — YouTube audio search (query → audio)
    // ─────────────────────────────────────────────
    play: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/ytplay",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.channel",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.url",
                download:  "result.download"
            }
        },
        {
            name: "azbry2",
            url: "https://api.azbry.com/api/download/ytplay2",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.channel",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.url",
                download:  "result.download"
            }
        },
        {
            name: "davidcyril",
            url: "https://apis.davidcyriltech.my.id/play-v2",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "success",
                title:     "result.title",
                channel:   null,
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.source",
                download:  "result.audio.url"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/ytplay",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.channel",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.url",
                download:  "result.download_url"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🎧 SPOTIFYPLAY — Spotify search (query → audio)
    // ─────────────────────────────────────────────
    spotifyplay: [
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/spotifyplay",
            method: "GET",
            param: "q",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.url",
                download:  "result.download_url"
            }
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/spoplay",
            method: "GET",
            param: "q",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.cover",
                duration:  "result.duration",
                videoUrl:  "result.deezerUrl",
                download:  "result.downloadLink"
            }
        }
    ],

    // ═════════════════════════════════════════════
    //  🎧  MUSIC — DOWNLOAD BY URL
    // ═════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  🎧 YTMP3 — YouTube → MP3 (URL → audio)
    // ─────────────────────────────────────────────
    ytmp3: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/ytmp3",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.channel",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  "result.url",
                download:  "result.download"
            }
        },
        {
            name: "davidcyril",
            url: "https://apis.davidcyriltech.my.id/download/ytmp3",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "success",
                title:     "result.title",
                channel:   null,
                thumbnail: "result.thumbnail",
                duration:  null,
                videoUrl:  null,
                download:  "result.download_url"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/ytmp3",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   null,
                thumbnail: null,
                duration:  "result.duration",
                videoUrl:  null,
                download:  "result.url"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🎧 SPOTIFY — Spotify URL → MP3 (URL → audio)
    // ─────────────────────────────────────────────
    spotify: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/spotify",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "title",
                channel:   "author",
                thumbnail: "cover",
                duration:  null,
                videoUrl:  null,
                download:  "downloadLink"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/spotify",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: null,
                duration:  null,
                videoUrl:  null,
                download:  "result.url"
            }
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/spotify",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            durationInMs: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.cover",
                duration:  "result.duration",
                videoUrl:  null,
                download:  "result.download"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🍎 APPLEMUSIC — Apple Music URL → MP3
    // ─────────────────────────────────────────────
    applemusic: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/applemusic",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: null,
                duration:  null,
                videoUrl:  null,
                download:  "result.download"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/applemusic",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.album_detail.album",
                channel:   "result.album_detail.artist",
                thumbnail: "result.album_detail.thumbnail",
                duration:  null,
                videoUrl:  null,
                download:  null
            }
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/applemusic/v2",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.cover",
                duration:  null,
                videoUrl:  "result.url",
                download:  "result.download"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  ☁️ SOUNDCLOUD — SoundCloud URL → MP3
    // ─────────────────────────────────────────────
    soundcloud: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/soundcloud",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.thumbnail",
                duration:  "result.duration_ms",
                videoUrl:  null,
                download:  "result.download"
            }
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/soundcloud",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.artist",
                thumbnail: "result.artwork",
                duration:  "result.durationMs",
                videoUrl:  "result.url",
                download:  "result.downloadUrl"
            }
        }
    ],

    // ═════════════════════════════════════════════
    //  🎬  VIDEO — YOUTUBE
    // ═════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  🎬 YTMP4 — YouTube → MP4 (URL → video)
    // ─────────────────────────────────────────────
    ytmp4: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/ytmp4",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.author",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  null,
                download:  "result.download"
            }
        },
        {
            name: "davidcyril",
            url: "https://apis.davidcyriltech.my.id/download/ytmp4",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            fields: {
                success:   "success",
                title:     "result.title",
                channel:   null,
                thumbnail: "result.thumbnail",
                duration:  null,
                videoUrl:  null,
                download:  "result.download_url"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/v1/ytmp4",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.author",
                thumbnail: "result.thumbnail",
                duration:  "result.duration",
                videoUrl:  null,
                download:  "result.url"
            }
        }
    ],

    // ═════════════════════════════════════════════
    //  📱  SOCIAL MEDIA
    // ═════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  📸 INSTAGRAM — Posts / Reels / Carousels
    // ─────────────────────────────────────────────
    instagram: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/instagram",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "azbry",
            fields: {
                success: "status"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/instagram",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  📘 FACEBOOK — Video download (HD preferred)
    // ─────────────────────────────────────────────
    facebook: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/facebook",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "azbry",
            fields: {
                success: "status"
            }
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/facebook",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/facebook",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🎵 TIKTOK — Video download (no watermark)
    // ─────────────────────────────────────────────
    tiktok: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/tiktok",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/tiktok",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "azbry",
            fields: {
                success: "status"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/tiktok",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🐦 TWITTER / X — Video + Audio download
    // ─────────────────────────────────────────────
    twitter: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/x",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        },
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/x",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "azbry",
            fields: {
                success: "status"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/twitter",
            method: "GET",
            param: "url",
            timeout: 45000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  📌 PINTEREST — Image / Video download
    // ─────────────────────────────────────────────
    pinterest: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/pinterest",
            method: "GET",
            param: "url",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.user.username",
                thumbnail: "result.thumbnail",
                duration:  null,
                videoUrl:  null,
                download:  "result.download",
                type:      "result.type",
                images:    "result.images",
                videos:    "result.videos"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/pinterest",
            method: "GET",
            param: "url",
            timeout: 30000,
            enabled: true,
            fields: {
                success:   "status",
                title:     "result.title",
                channel:   "result.author",
                thumbnail: "result.thumbnail",
                duration:  null,
                videoUrl:  null,
                download:  "result.image"
            }
        }
    ],

    // ═════════════════════════════════════════════
    //  📦  FILE HOSTS & CLOUD STORAGE
    // ═════════════════════════════════════════════

    // ─────────────────────────────────────────────
    //  📂 GOOGLE DRIVE — File download
    // ─────────────────────────────────────────────
    gdrive: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/drive",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        },
        {
            name: "davidcyril",
            url: "https://apis.davidcyriltech.my.id/download/gdrive",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "davidcyril",
            fields: {
                success: "success"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/googledrive",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  🔥 MEDIAFIRE — File download
    // ─────────────────────────────────────────────
    mediafire: [
        {
            name: "azbry",
            url: "https://api.azbry.com/api/download/mediafire",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "azbry",
            fields: {
                success: "status"
            }
        },
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/mediafire",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        }
    ],

    // ─────────────────────────────────────────────
    //  📦 TERABOX — File / Folder download
    // ─────────────────────────────────────────────
    terabox: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/terabox",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            fields: {
                success: "status"
            }
        }
        // ⬇️ Add more Terabox providers here
    ],

    // ─────────────────────────────────────────────
    //  🐙 GITHUB — Repo download (ZIP / TAR)
    // ─────────────────────────────────────────────
    github: [
        {
            name: "zellrayy",
            url: "https://zellrayy.com/download/github",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "zellrayy",
            fields: {
                success: "status"
            }
        },
        {
            name: "nexray",
            url: "https://api.nexray.eu.cc/downloader/github",
            method: "GET",
            param: "url",
            timeout: 60000,
            enabled: true,
            shape: "nexray",
            fields: {
                success: "status"
            }
        }
    ]

};