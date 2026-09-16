// ──────────────────────────────────────────────────
//  BIGSTACK — Force Join Helper
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

// ─── Get the raw config ─────────────────────────────
const raw = branding.forceJoin || {
    enabled: false,
    strict: false,
    telegram: [],
    whatsapp: []
};

// ─── Helper: Is force join enabled? ─────────────────
function isEnabled() {
    return raw.enabled === true;
}

// ─── Helper: Is strict mode on? ─────────────────────
function isStrict() {
    return raw.strict === true;
}

// ─── Helper: Get all Telegram channels ──────────────
function getTelegramChannels() {
    return (raw.telegram || []).filter((c) => c.id && c.url);
}

// ─── Helper: Get all WhatsApp channels ──────────────
function getWhatsappChannels() {
    return raw.whatsapp || [];
}

// ─── Helper: How many Telegram channels? ────────────
function telegramCount() {
    return getTelegramChannels().length;
}

// ─── Helper: How many WhatsApp channels? ────────────
function whatsappCount() {
    return getWhatsappChannels().length;
}

// ─── Helper: Total channels to join ─────────────────
function totalCount() {
    return telegramCount() + whatsappCount();
}

// ─── Helper: Get channel by name ────────────────────
function getChannel(name) {
    return getTelegramChannels().find((c) => c.name === name) || null;
}

// ─── Helper: Get channel IDs only ───────────────────
function getChannelIds() {
    return getTelegramChannels().map((c) => c.id);
}

// ─── Helper: Do we need to check WhatsApp? ──────────
// (WhatsApp can't be verified, so this is mostly for display)
function hasWhatsapp() {
    return whatsappCount() > 0;
}

// ─── Helper: Build the join keyboard ────────────────
// Returns inline keyboard rows for the [Join] [Verify] buttons
function buildKeyboard(prefix = "/") {
    const rows = [];

    // Telegram channels — one button each
    for (const ch of getTelegramChannels()) {
        rows.push([
            {
                text: `📢 Join ${ch.name}`,
                url: ch.url
            }
        ]);
    }

    // WhatsApp channel
    for (const wa of getWhatsappChannels()) {
        rows.push([
            {
                text: `💬 Join ${wa.name}`,
                url: wa.url
            }
        ]);
    }

    // Verify button (only if there's anything to verify)
    if (telegramCount() > 0) {
        rows.push([
            {
                text: "✅ I have joined — Verify",
                callback_data: "forcejoin:verify"
            }
        ]);
    }

    return { inline_keyboard: rows };
}

// ─── Helper: Build the "need to join" message ───────
function buildMessage() {
    const lines = [
        "🚫 *Access Denied*",
        "",
        "You must join our channels to use *BIGSTACK*.",
        ""
    ];

    for (const ch of getTelegramChannels()) {
        lines.push(`📢 [${ch.name}](${ch.url})`);
    }

    for (const wa of getWhatsappChannels()) {
        lines.push(`💬 [${wa.name}](${wa.url})`);
    }

    lines.push("");
    lines.push("After joining, tap *Verify* below.");
    lines.push("");
    lines.push(branding.branding.footer);

    return lines.join("\n");
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    // Raw config
    raw,

    // Flags
    isEnabled,
    isStrict,
    hasWhatsapp,

    // Counts
    telegramCount,
    whatsappCount,
    totalCount,

    // Getters
    getTelegramChannels,
    getWhatsappChannels,
    getChannel,
    getChannelIds,

    // Builders
    buildKeyboard,
    buildMessage
};