// ──────────────────────────────────────────────────
//  BIGSTACK — Site Map (URL → Platform Detector)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

// ─── All supported platforms ────────────────────────
// Order matters: first match wins
const SITES = [
    {
        platform: "youtube",
        name: "YouTube",
        emoji: "▶️",
        command: "yt",
        patterns: [
            /youtube\.com\/watch/i,
            /youtu\.be\//i,
            /youtube\.com\/shorts\//i,
            /youtube\.com\/playlist/i,
            /music\.youtube\.com/i
        ]
    },
    {
        platform: "instagram",
        name: "Instagram",
        emoji: "📸",
        command: "insta",
        patterns: [
            /instagram\.com\/(p|reel|reels|tv|stories)\//i,
            /instagr\.am\//i
        ]
    },
    {
        platform: "tiktok",
        name: "TikTok",
        emoji: "🎵",
        command: "tt",
        patterns: [
            /tiktok\.com\/@[\w.-]+\/video/i,
            /vm\.tiktok\.com\//i,
            /vt\.tiktok\.com\//i,
            /tiktok\.com\/t\//i
        ]
    },
    {
        platform: "twitter",
        name: "Twitter / X",
        emoji: "🐦",
        command: "tw",
        patterns: [
            /twitter\.com\/\w+\/status/i,
            /x\.com\/\w+\/status/i,
            /t\.co\//i
        ]
    },
    {
        platform: "facebook",
        name: "Facebook",
        emoji: "📘",
        command: "fb",
        patterns: [
            /facebook\.com\/.*\/videos\//i,
            /facebook\.com\/watch/i,
            /fb\.watch\//i,
            /facebook\.com\/reel\//i
        ]
    },
    {
        platform: "pinterest",
        name: "Pinterest",
        emoji: "📌",
        command: "pin",
        patterns: [
            /pinterest\.com\/pin\//i,
            /pin\.it\//i
        ]
    },
    {
        platform: "gdrive",
        name: "Google Drive",
        emoji: "📂",
        command: "gdrive",
        patterns: [
            /drive\.google\.com\/file\/d\//i,
            /drive\.google\.com\/open\?id=/i,
            /drive\.google\.com\/uc\?id=/i
        ]
    },
    {
        platform: "spotify",
        name: "Spotify",
        emoji: "🎧",
        command: "spotify",
        patterns: [
            /open\.spotify\.com\/(track|album|playlist|artist)\//i,
            /spoti\.fi\//i
        ]
    },
    {
        platform: "soundcloud",
        name: "SoundCloud",
        emoji: "☁️",
        command: "soundcloud",
        patterns: [
            /soundcloud\.com\//i,
            /snd\.sc\//i
        ]
    },
    {
        platform: "mediafire",
        name: "MediaFire",
        emoji: "🔥",
        command: "mediafire",
        patterns: [
            /mediafire\.com\//i
        ]
    },
    {
        platform: "reddit",
        name: "Reddit",
        emoji: "👽",
        command: "reddit",
        patterns: [
            /reddit\.com\//i,
            /redd\.it\//i
        ]
    },
    {
        platform: "threads",
        name: "Threads",
        emoji: "🧵",
        command: "threads",
        patterns: [
            /threads\.net\//i
        ]
    },
    {
        platform: "snapchat",
        name: "Snapchat",
        emoji: "👻",
        command: "snapchat",
        patterns: [
            /snapchat\.com\//i
        ]
    },
    {
        platform: "vimeo",
        name: "Vimeo",
        emoji: "🎬",
        command: "vimeo",
        patterns: [
            /vimeo\.com\//i
        ]
    },
    {
        platform: "dailymotion",
        name: "Dailymotion",
        emoji: "📺",
        command: "dailymotion",
        patterns: [
            /dailymotion\.com\//i,
            /dai\.ly\//i
        ]
    }
];

// ─── Main detector ──────────────────────────────────
function detect(url) {
    if (!url || typeof url !== "string") return null;

    for (const site of SITES) {
        for (const pattern of site.patterns) {
            if (pattern.test(url)) {
                return {
                    platform: site.platform,
                    name: site.name,
                    emoji: site.emoji,
                    command: site.command
                };
            }
        }
    }

    return null;
}

// ─── Is URL supported? ──────────────────────────────
function isSupported(url) {
    return detect(url) !== null;
}

// ─── Just get platform name ─────────────────────────
function getPlatform(url) {
    const result = detect(url);
    return result ? result.platform : null;
}

// ─── Get the command to use ─────────────────────────
function getCommand(url) {
    const result = detect(url);
    return result ? result.command : null;
}

// ─── List all platforms ─────────────────────────────
function listPlatforms() {
    return SITES.map((s) => ({
        platform: s.platform,
        name: s.name,
        emoji: s.emoji,
        command: s.command
    }));
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    SITES,
    detect,
    isSupported,
    getPlatform,
    getCommand,
    listPlatforms
};