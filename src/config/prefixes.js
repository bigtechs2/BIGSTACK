// ──────────────────────────────────────────────────
//  BIGSTACK — Command Prefixes
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

module.exports = {

    // ─── All allowed prefixes ────────────────────────
    // The bot will respond to ANY of these
    allowed: [
        "/",   // Telegram default (always keep)
        ".",   // Dot style
        "!",   // Bang style
        "#"    // Hash style
    ],

    // ─── Default prefix ──────────────────────────────
    // Used in examples, help texts, error messages
    default: "/",

    // ─── Slash commands only? ────────────────────────
    // true  = only "/" works (Telegram standard)
    // false = all allowed prefixes work
    slashOnly: false,

    // ─── Case-sensitive commands? ────────────────────
    // true  = "/Play" ≠ "/play"
    // false = "/Play" = "/play"
    caseSensitive: false,

    // ─── Mention prefix ──────────────────────────────
    // Allow "/play@BigStackBot" in groups?
    allowBotMention: true,

    // ─── Prefix-agnostic commands ────────────────────
    // These commands work WITHOUT any prefix (just typed directly)
    // Example: user types "play faded" instead of "/play faded"
    noPrefix: [],

    // ─── System prefixes ─────────────────────────────
    // Internal-only prefixes (never shown to users)
    system: {
        CALLBACK: "cb",   // For inline button callbacks
        INTERNAL: "sys"   // For internal events
    },

    // ─── Regex builders ──────────────────────────────
    // Used by the loader to detect commands
    buildRegex() {
        const prefixes = this.allowed
            .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("");
        return new RegExp(`^[${prefixes}]`, "i");
    },

    // ─── Strip prefix from a message ─────────────────
    // Input:  "/play faded"
    // Output: { prefix: "/", command: "play", args: "faded" }
    parse(text) {
        if (!text || typeof text !== "string") {
            return { prefix: null, command: null, args: "" };
        }

        const trimmed = text.trim();
        const firstChar = trimmed[0];

        if (!this.allowed.includes(firstChar)) {
            return { prefix: null, command: null, args: trimmed };
        }

        const withoutPrefix = trimmed.slice(1).trim();
        const parts = withoutPrefix.split(/\s+/);

        let command = parts[0] || "";
        const args = parts.slice(1).join(" ");

        // Handle /command@botname
        if (command.includes("@")) {
            command = command.split("@")[0];
        }

        if (!this.caseSensitive) {
            command = command.toLowerCase();
        }

        return { prefix: firstChar, command, args };
    }
};