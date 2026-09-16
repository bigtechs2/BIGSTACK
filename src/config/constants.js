// ──────────────────────────────────────────────────
//  BIGSTACK — Constants
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {

    // ─── Command Categories ─────────────────────────
    CATEGORIES: {
        PLAYER: "player",
        DOWNLOADER: "downloader",
        SEARCH: "search",
        UTILITY: "utility",
        WEBAPP: "webapp",
        ADMIN: "admin"
    },

    // ─── Permission Levels ──────────────────────────
    PERMISSIONS: {
        USER: "user",
        PREMIUM: "premium",
        ADMIN: "admin",
        OWNER: "owner"
    },

    // ─── Currency / Coins ───────────────────────────
    COINS: {
        CURRENCY: "Coins",
        EMOJI: "🪙",
        MIN_TRANSFER: 1,
        MAX_TRANSFER: 10000,
        DEFAULT_BALANCE: 0,
        DAILY_BONUS_FREE: 50,
        DAILY_BONUS_PREMIUM: 150,
        REFERRER_BONUS: 25,
        REFEREE_BONUS: 10,
        COOLDOWN_HOURS: 24
    },

    // ─── Premium ────────────────────────────────────
    PREMIUM: {
        PRICE_WEEKLY: 100,
        PRICE_MONTHLY: 300,
        PRICE_YEARLY: 2500,
        DURATION: {
            WEEKLY: 7 * 24 * 60 * 60 * 1000,    // 7 days
            MONTHLY: 30 * 24 * 60 * 60 * 1000,  // 30 days
            YEARLY: 365 * 24 * 60 * 60 * 1000   // 365 days
        }
    },

    // ─── File Size Limits ───────────────────────────
    LIMITS: {
        MAX_FILE_SIZE_MB: 2000,
        MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024 * 1024,   // 2GB
        MAX_PHOTO_SIZE_MB: 10,
        MAX_AUDIO_SIZE_MB: 50,
        MAX_VIDEO_SIZE_MB: 2000,
        MAX_DOCUMENT_SIZE_MB: 2000,
        MAX_PLAYLIST_SIZE: 50,
        MAX_SEARCH_RESULTS: 10,
        MAX_QUEUE_SIZE: 3
    },

    // ─── Timeouts (in milliseconds) ─────────────────
    TIMEOUTS: {
        API: 30 * 1000,           // 30s
        DOWNLOAD: 120 * 1000,     // 2 min
        YTDLP: 180 * 1000,        // 3 min
        EDIT_MESSAGE: 5 * 1000,   // 5s
        COOLDOWN_DAILY: 24 * 60 * 60 * 1000,  // 24h
        COOLDOWN_RATE: 60 * 1000  // 1 min
    },

    // ─── Rate Limits ────────────────────────────────
    RATE_LIMIT: {
        PER_USER_PER_MIN: 10,
        PER_GROUP_PER_MIN: 30,
        PER_CHANNEL_PER_MIN: 100,
        GLOBAL_PER_MIN: 500
    },

    // ─── Cache TTL (in seconds) ─────────────────────
    CACHE_TTL: {
        SEARCH: 600,       // 10 min
        DOWNLOAD: 1800,    // 30 min
        USER: 300,         // 5 min
        SETTINGS: 3600,    // 1 hour
        FORCE_JOIN: 120    // 2 min
    },

    // ─── Supported Platforms ────────────────────────
    PLATFORMS: {
        YOUTUBE: "youtube",
        INSTAGRAM: "instagram",
        TIKTOK: "tiktok",
        TWITTER: "twitter",
        FACEBOOK: "facebook",
        PINTEREST: "pinterest",
        SPOTIFY: "spotify",
        SOUNDCLOUD: "soundcloud",
        GDRIVE: "gdrive",
        MEDIAFIRE: "mediafire"
    },

    // ─── Supported Languages ────────────────────────
    LANGUAGES: {
        EN: "en",
        SW: "sw",
        HI: "hi",
        AR: "ar"
    },

    // ─── Regex Patterns ─────────────────────────────
    REGEX: {
        URL: /https?:\/\/[^\s]+/gi,
        YOUTUBE: /(youtube\.com|youtu\.be)/i,
        INSTAGRAM: /(instagram\.com|instagr\.am)/i,
        TIKTOK: /(tiktok\.com|vm\.tiktok\.com)/i,
        TWITTER: /(twitter\.com|x\.com)/i,
        FACEBOOK: /(facebook\.com|fb\.watch)/i,
        PINTEREST: /(pinterest\.com|pin\.it)/i,
        SPOTIFY: /(spotify\.com|spoti\.fi)/i,
        SOUNDCLOUD: /soundcloud\.com/i,
        GDRIVE: /drive\.google\.com/i,
        MEDIAFIRE: /mediafire\.com/i
    },

    // ─── Button Emojis ──────────────────────────────
    EMOJIS: {
        SUCCESS: "✅",
        ERROR: "❌",
        WARNING: "⚠️",
        INFO: "ℹ️",
        LOADING: "⏳",
        SEARCH: "🔍",
        DOWNLOAD: "📥",
        PLAY: "▶️",
        PAUSE: "⏸️",
        STOP: "⏹️",
        MUSIC: "🎵",
        VIDEO: "🎬",
        PHOTO: "🖼️",
        DOCUMENT: "📄",
        LINK: "🔗",
        COIN: "🪙",
        PREMIUM: "💎",
        CROWN: "👑",
        SHIELD: "🛡️",
        FIRE: "🔥",
        STAR: "⭐",
        HEART: "♥︎",
        ROCKET: "🚀"
    },

    // ─── Cache Keys ─────────────────────────────────
    CACHE_KEYS: {
        USER: (id) => `user:${id}`,
        SEARCH: (q) => `search:${q.toLowerCase()}`,
        DOWNLOAD: (url) => `download:${Buffer.from(url).toString("base64")}`,
        FORCE_JOIN: (userId, channel) => `fj:${userId}:${channel}`,
        RATE_LIMIT: (userId) => `rl:${userId}`
    },

    // ─── Callback Data Prefixes ─────────────────────
    CALLBACK: {
        VERIFY: "verify",
        DAILY: "daily",
        PREMIUM: "premium",
        SETTINGS: "settings",
        LANG: "lang",
        CANCEL: "cancel",
        PAGE: "page",
        QUALITY: "quality",
        DOWNLOAD_OPTION: "dl_opt"
    },

    // ─── HTTP Status Codes ──────────────────────────
    HTTP: {
        OK: 200,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        TOO_MANY_REQUESTS: 429,
        SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503
    },

    // ─── Queue Priorities ───────────────────────────
    PRIORITY: {
        OWNER: 10,
        PREMIUM: 5,
        USER: 1
    },

    // ─── Log Levels ─────────────────────────────────
    LOG_LEVELS: {
        ERROR: "error",
        WARN: "warn",
        INFO: "info",
        DEBUG: "debug"
    },

    // ─── Miscellaneous ──────────────────────────────
    MISC: {
        MAX_MESSAGE_LENGTH: 4096,
        MAX_CAPTION_LENGTH: 1024,
        MAX_BUTTONS_PER_ROW: 3,
        MAX_BUTTON_ROWS: 10,
        EDIT_THROTTLE_MS: 1000,
        DEFAULT_PAGE_SIZE: 5
    }
};