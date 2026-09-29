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
        AI: "ai",
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
        START_BONUS: 20,
        DAILY_BONUS_FREE: 100,
        DAILY_BONUS_PREMIUM: 300,
        REFERRER_BONUS: 25,
        REFEREE_BONUS: 10,
        QUIZ_CORRECT_BONUS: 50,
        COOLDOWN_HOURS: 24
    },

    // ─── Streak Rewards ─────────────────────────────
    STREAK: {
        DAY_1: 50,
        DAY_2: 55,
        DAY_3: 60,
        DAY_4: 70,
        DAY_5: 80,
        DAY_6: 90,
        DAY_7: 100,
        MAX_STREAK: 7,
        RESET_AFTER_MISSED_DAYS: 2
    },

    // ─── Premium ────────────────────────────────────
    PREMIUM: {
        STARS_WEEKLY: 15,
        STARS_MONTHLY: 45,
        STARS_YEARLY: 100,

        TSH_WEEKLY: "500 TSh",
        TSH_MONTHLY: "1,500 TSh",
        TSH_YEARLY: "3,500 TSh",

        DURATION: {
            WEEKLY: 7 * 24 * 60 * 60 * 1000,
            MONTHLY: 30 * 24 * 60 * 60 * 1000,
            YEARLY: 365 * 24 * 60 * 60 * 1000
        }
    },

    // ─── Coin Package Prices ────────────────────────
    PACKAGES: {
        COINS_100:  { coins: 100,  stars: 15,  tsh: "500 TSh" },
        COINS_220:  { coins: 220,  stars: 30,  tsh: "1,000 TSh" },
        COINS_350:  { coins: 350,  stars: 45,  tsh: "1,500 TSh" },
        COINS_600:  { coins: 600,  stars: 70,  tsh: "2,500 TSh" },
        COINS_1000: { coins: 1000, stars: 100, tsh: "3,500 TSh" }
    },

    // ─── AI ─────────────────────────────────────────
    AI: {
        FREE_DAILY_MESSAGES: 15,
        FREE_MEMORY_DEPTH: 20,
        CONTEXT_WINDOW: 20,
        COST_TEXT: 1,
        COST_IMAGE: 5,
        COST_VOICE_IN: 2,
        COST_VOICE_OUT: 3
    },

    // ─── File Size Limits ───────────────────────────
    LIMITS: {
        MAX_FILE_SIZE_MB: 3000,
        MAX_FILE_SIZE_BYTES: 3 * 1024 * 1024 * 1024,
        MAX_SEND_SIZE_MB: 30,
        MAX_SEND_SIZE_BYTES: 30 * 1024 * 1024,
        MAX_PHOTO_SIZE_MB: 10,
        MAX_AUDIO_SIZE_MB: 50,
        MAX_VIDEO_SIZE_MB: 3000,
        MAX_DOCUMENT_SIZE_MB: 3000,
        MAX_PLAYLIST_SIZE: 50,
        MAX_SEARCH_RESULTS: 10,
        MAX_QUEUE_SIZE: 3,
        MAX_AI_MESSAGE_LENGTH: 4000,
        MAX_BROADCAST_PER_HOUR: 5
    },

    // ─── Timeouts (ms) ──────────────────────────────
    TIMEOUTS: {
        API: 30 * 1000,
        API_LONG: 45 * 1000,
        DOWNLOAD: 120 * 1000,
        DOWNLOAD_LONG: 180 * 1000,
        YTDLP: 180 * 1000,
        EDIT_MESSAGE: 5 * 1000,
        COOLDOWN_DAILY: 24 * 60 * 60 * 1000,
        COOLDOWN_RATE: 60 * 1000
    },

    // ─── Rate Limits ────────────────────────────────
    RATE_LIMIT: {
        COMMANDS_PER_MIN: 15,
        DOWNLOADS_PER_MIN: 8,
        AI_PER_MIN: 30,
        PER_GROUP_PER_MIN: 30,
        GLOBAL_PER_MIN: 500,
        EXEMPT_COMMANDS: [
            "start", "help", "menu", "daily", "balance", "profile"
        ]
    },

    // ─── Cache TTL (seconds) ────────────────────────
    CACHE_TTL: {
        SEARCH: 600,
        DOWNLOAD: 1800,
        USER: 300,
        SETTINGS: 3600,
        FORCE_JOIN: 120,
        AI_MEMORY: 300,
        RATE_LIMIT: 60
    },

    // ─── Supported Platforms ────────────────────────
    PLATFORMS: {
        YOUTUBE: "youtube",
        SPOTIFY: "spotify",
        APPLEMUSIC: "applemusic",
        SOUNDCLOUD: "soundcloud",
        INSTAGRAM: "instagram",
        TIKTOK: "tiktok",
        TWITTER: "twitter",
        FACEBOOK: "facebook",
        PINTEREST: "pinterest",
        GDRIVE: "gdrive",
        MEDIAFIRE: "mediafire",
        TERABOX: "terabox",
        GITHUB: "github"
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
        SPOTIFY: /(spotify\.com|spoti\.fi)/i,
        APPLEMUSIC: /(music\.apple\.com|itunes\.apple\.com)/i,
        SOUNDCLOUD: /soundcloud\.com/i,
        INSTAGRAM: /(instagram\.com|instagr\.am)/i,
        TIKTOK: /(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i,
        TWITTER: /(twitter\.com|x\.com)/i,
        FACEBOOK: /(facebook\.com|fb\.watch)/i,
        PINTEREST: /(pinterest\.com|pin\.it)/i,
        GDRIVE: /drive\.google\.com/i,
        MEDIAFIRE: /mediafire\.com/i,
        TERABOX: /(terabox\.com|1024terabox\.com|teraboxapp\.com)/i,
        GITHUB: /github\.com/i,
        PHONE_TZ: /^(\+?255|0)?[67]\d{8}$/
    },

    // ─── Symbols (non-emoji, for bot output) ────────
    SYMBOLS: {
        SUCCESS: "✓",
        ERROR: "✗",
        WARNING: "⚠",
        INFO: "ℹ",
        LOADING: "◐",
        SEARCH: "◈",
        DOWNLOAD: "▼",
        PLAY: "▶",
        PAUSE: "▮",
        STOP: "■",
        MUSIC: "♬",
        VIDEO: "▣",
        PHOTO: "▩",
        DOCUMENT: "▤",
        LINK: "➤",
        PREMIUM: "★",
        CROWN: "◉",
        SHIELD: "⊛",
        FIRE: "◆",
        STAR: "★",
        HEART: "♥︎",
        ROCKET: "➤"
    },

    // ─── Emojis (for buttons, headings) ─────────────
    EMOJIS: {
        SUCCESS: "✅",
        ERROR: "❌",
        WARNING: "⚠️",
        INFO: "ℹ️",
        LOADING: "⏳",
        SEARCH: "🔍",
        DOWNLOAD: "📥",
        PLAY: "▶️",
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
        RATE_LIMIT: (userId) => `rl:${userId}`,
        AI_MEMORY: (userId) => `aimem:${userId}`,
        PAYMENT: (userId) => `payment:${userId}`
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
        DOWNLOAD_OPTION: "dl_opt",
        MENU: "menu",
        STORE: "store",
        BUY: "buy",
        AI: "ai",
        FORCEJOIN: "forcejoin"
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

    // ─── Payment Methods ────────────────────────────
    PAYMENT: {
        STARS: "stars",
        MPESA: "mpesa",
        TIGOPESA: "tigopesa",
        AIRTEL: "airtel",
        HALOPESA: "halopesa",
        CRYPTO: "crypto",
        SONICPESA: "sonicpesa",
        MIN_TSH: 500,
        MAX_TSH: 3500,
        MAX_STARS: 100
    },

    // ─── Transaction Types ──────────────────────────
    TRANSACTION_TYPES: {
        EARN: "earn",
        SPEND: "spend",
        BUY: "buy",
        PREMIUM: "premium",
        GIFT_IN: "gift_in",
        GIFT_OUT: "gift_out",
        REFUND: "refund",
        ADMIN: "admin"
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