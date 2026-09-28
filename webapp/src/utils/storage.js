// ──────────────────────────────────────────────────
//  BIGSTACK — Local Storage Helpers
//  © BIGSTACK by bigmanjtech™ with ♥︎
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const PREFIX = "bigstack_";

export const storage = {
    set(key, value) {
        try {
            localStorage.setItem(PREFIX + key, JSON.stringify(value));
        } catch (err) {
            console.warn("[storage] set failed:", err);
        }
    },

    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(PREFIX + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(PREFIX + key);
        } catch {}
    },

    clear() {
        try {
            Object.keys(localStorage)
                .filter((k) => k.startsWith(PREFIX))
                .forEach((k) => localStorage.removeItem(k));
        } catch {}
    }
};

// ─── Specific keys ──────────────────────────────────
export const KEYS = {
    TOKEN: "token",
    USER: "user",
    THEME: "theme",
    LANGUAGE: "language"
};