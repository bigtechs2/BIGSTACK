// ──────────────────────────────────────────────────
//  BIGSTACK — Dynamic Theming
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

// ─── Platform → color map ──────────────────────────
export const PLATFORM_COLORS = {
    youtube:    { color: "#ff0000", class: "theme-youtube",    icon: "▶" },
    spotify:    { color: "#1db954", class: "theme-spotify",    icon: "♬" },
    applemusic: { color: "#fa243c", class: "theme-applemusic", icon: "♪" },
    soundcloud: { color: "#ff5500", class: "theme-soundcloud", icon: "☁" },
    instagram:  { color: "#e1306c", class: "theme-instagram",  icon: "◉" },
    tiktok:     { color: "#25f4ee", class: "theme-tiktok",     icon: "♪" },
    facebook:   { color: "#1877f2", class: "theme-facebook",   icon: "f" },
    twitter:    { color: "#1da1f2", class: "theme-twitter",    icon: "◈" },
    pinterest:  { color: "#e60023", class: "theme-pinterest",  icon: "◈" },
    gdrive:     { color: "#4285f4", class: "theme-gdrive",     icon: "△" },
    github:     { color: "#8b5cf6", class: "theme-github",     icon: "◆" },
    terabox:    { color: "#0076ff", class: "theme-terabox",    icon: "□" },
    mediafire:  { color: "#1299f3", class: "theme-mediafire",  icon: "◈" },
    default:    { color: "#a855f7", class: "",                 icon: "◆" }
};

// ─── Apply platform theme ───────────────────────────
export function applyPlatformTheme(platform) {
    const theme = PLATFORM_COLORS[platform] || PLATFORM_COLORS.default;

    // Remove previous theme classes
    Object.values(PLATFORM_COLORS).forEach((p) => {
        if (p.class) document.body.classList.remove(p.class);
    });

    // Apply new theme
    if (theme.class) document.body.classList.add(theme.class);

    document.documentElement.style.setProperty("--platform-color", theme.color);

    return theme;
}

// ─── Reset to default ───────────────────────────────
export function resetPlatformTheme() {
    applyPlatformTheme("default");
}