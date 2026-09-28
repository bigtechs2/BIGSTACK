// ──────────────────────────────────────────────────
//  BIGSTACK — Frontend Constants
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

export const API_BASE =
    import.meta.env.VITE_API_URL || "/api";

export const BRAND = {
    name: "BIGSTACK",
    footer: "© BIGSTACK by bigmanjtech™ with ♥︎",
    version: "1.0.0",
    tagline: "Media Downloader & Search"
};

// ─── Navigation items ───────────────────────────────
export const NAV_ITEMS = [
    { path: "/",           icon: "◆",  label: "Home" },
    { path: "/search",     icon: "◈",  label: "Search" },
    { path: "/downloader", icon: "◇",  label: "Download" },
    { path: "/profile",    icon: "◉",  label: "Profile" },
    { path: "/store",      icon: "★",  label: "Store" }
];

// ─── Downloader platforms ───────────────────────────
export const PLATFORMS = [
    { id: "youtube",    name: "YouTube",      icon: "▶" },
    { id: "spotify",    name: "Spotify",      icon: "♬" },
    { id: "applemusic", name: "Apple Music",  icon: "♪" },
    { id: "soundcloud", name: "SoundCloud",   icon: "☁" },
    { id: "instagram",  name: "Instagram",    icon: "◉" },
    { id: "tiktok",     name: "TikTok",       icon: "♪" },
    { id: "twitter",    name: "Twitter / X",  icon: "◈" },
    { id: "facebook",   name: "Facebook",     icon: "f" },
    { id: "pinterest",  name: "Pinterest",    icon: "◈" },
    { id: "gdrive",     name: "Google Drive", icon: "△" },
    { id: "github",     name: "GitHub",       icon: "◆" },
    { id: "terabox",    name: "Terabox",      icon: "□" }
];