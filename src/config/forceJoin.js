// ──────────────────────────────────────────────────
//  BIGSTACK — Force Join Helper
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const branding = require("./branding");

// ─── Raw config ─────────────────────────────────────
const raw = branding.forceJoin || {
    enabled: false,
    strict: false,
    telegram: [],
    whatsapp: []
};

// ══════════════════════════════════════════════════
//  FLAGS
// ══════════════════════════════════════════════════
function isEnabled() {
    return raw.enabled === true;
}

function isStrict() {
    return raw.strict === true;
}

function hasWhatsapp() {
    return whatsappCount() > 0;
}

// ══════════════════════════════════════════════════
//  GETTERS
// ══════════════════════════════════════════════════
function getTelegramChannels() {
    return (raw.telegram || []).filter((c) => c.id && c.url);
}

function getWhatsappChannels() {
    return raw.whatsapp || [];
}

function getChannel(name) {
    return getTelegramChannels().find((c) => c.name === name) || null;
}

function getChannelIds() {
    return getTelegramChannels().map((c) => c.id);
}

// ══════════════════════════════════════════════════
//  COUNTS
// ══════════════════════════════════════════════════
function telegramCount() {
    return getTelegramChannels().length;
}

function whatsappCount() {
    return getWhatsappChannels().length;
}

function totalCount() {
    return telegramCount() + whatsappCount();
}

// ══════════════════════════════════════════════════
//  BUILDERS
// ══════════════════════════════════════════════════
function buildKeyboard() {
    const rows = [];

    // ─── Telegram channels ⏤ one button each ────────
    for (const ch of getTelegramChannels()) {
        rows.push([
            {
                text: `➤ Join ${ch.name}`,
                url: ch.url
            }
        ]);
    }

    // ─── WhatsApp channel ───────────────────────────
    for (const wa of getWhatsappChannels()) {
        rows.push([
            {
                text: `➤ Join ${wa.name}`,
                url: wa.url
            }
        ]);
    }

    // ─── Verify button ──────────────────────────────
    if (telegramCount() > 0) {
        rows.push([
            {
                text: "✓ I have joined — Verify",
                callback_data: "forcejoin:verify"
            }
        ]);
    }

    return { inline_keyboard: rows };
}

function buildMessage() {
    const lines = [
        "◈ *Access Required*",
        "",
        "▸ You must join our channels",
        "   to use *BIGSTACK*.",
        ""
    ];

    const channels = getTelegramChannels();
    if (channels.length > 0) {
        lines.push("◈ *Telegram*");
        for (const ch of channels) {
            lines.push(`   ➤ [${ch.name}](${ch.url})`);
        }
        lines.push("");
    }

    const whatsapp = getWhatsappChannels();
    if (whatsapp.length > 0) {
        lines.push("◈ *WhatsApp*");
        for (const wa of whatsapp) {
            lines.push(`   ➤ [${wa.name}](${wa.url})`);
        }
        lines.push("");
    }

    lines.push("▸ After joining, tap *✓ Verify*");
    lines.push("");
    lines.push(branding.branding.footer);

    return lines.join("\n");
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    raw,
    isEnabled,
    isStrict,
    hasWhatsapp,
    telegramCount,
    whatsappCount,
    totalCount,
    getTelegramChannels,
    getWhatsappChannels,
    getChannel,
    getChannelIds,
    buildKeyboard,
    buildMessage
};