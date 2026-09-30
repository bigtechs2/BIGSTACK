//  BIGSTACK — Permissions
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {
    LEVELS: {
        BANNED: -1,
        USER: 0,
        PREMIUM: 1,
        ADMIN: 2,
        OWNER: 3
    },

    COIN_COSTS: {
        play: 5, ytmp3: 5, ytmp4: 10, spotifyplay: 5, spotify: 5,
        applemusic: 5, soundcloud: 3, instagram: 3, tiktok: 3,
        twitter: 3, facebook: 3, pinterest: 2, gdrive: 3,
        mediafire: 3, terabox: 3, github: 3, applesearch: 2,
        spotifysearch: 2, youtubesearch: 2, pinterestsearch: 2,
        imagesearch: 1, lyrics: 1, spotifylyric: 1, happymod: 2,
        whatmusic: 5, search: 1, song: 2, movie: 2, tv: 2,
        anime: 2, manga: 2, image: 1
    },

    FREE_COMMANDS: [
        "start", "help", "menu", "about", "settings", "lang",
        "daily", "balance", "profile", "refer", "verify", "ai"
    ],

    PREMIUM_COMMANDS: ["hd", "4k", "lossless", "batch", "playlist"],
    OWNER_COMMANDS: ["broadcast", "eval", "shell", "backup"],
    ADMIN_COMMANDS: ["stats", "ban", "unban", "pending", "approve", "reject"],

    getCoinCost(commandName) {
        if (this.FREE_COMMANDS.includes(commandName)) return 0;
        return this.COIN_COSTS[commandName] ?? 0;
    },

    isPremiumCommand(cmd) { return this.PREMIUM_COMMANDS.includes(cmd); },
    isOwnerCommand(cmd) { return this.OWNER_COMMANDS.includes(cmd); },
    isAdminCommand(cmd) { return this.ADMIN_COMMANDS.includes(cmd); },

    getUserLevel(user) {
        if (!user) return this.LEVELS.USER;
        if (user.banned) return this.LEVELS.BANNED;
        if (user.isOwner) return this.LEVELS.OWNER;
        if (user.isAdmin) return this.LEVELS.ADMIN;
        if (user.premium && user.premiumExpiry > new Date()) return this.LEVELS.PREMIUM;
        return this.LEVELS.USER;
    },

    canRun(user, command) {
        const level = this.getUserLevel(user);
        if (level === this.LEVELS.BANNED) return { ok: false, reason: "You are banned." };
        if (this.isOwnerCommand(command.name) && level < this.LEVELS.OWNER) return { ok: false, reason: "Owner only." };
        if (this.isAdminCommand(command.name) && level < this.LEVELS.ADMIN) return { ok: false, reason: "Admin only." };
        if (this.isPremiumCommand(command.name) && level < this.LEVELS.PREMIUM) return { ok: false, reason: "Premium only." };
        const cost = this.getCoinCost(command.name);
        if (cost > 0 && (user.coins || 0) < cost) return { ok: false, reason: `Need ${cost} coins.` };
        return { ok: true };
    }
};

