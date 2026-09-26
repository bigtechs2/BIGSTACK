// ──────────────────────────────────────────────────
//  BIGSTACK — Time Helpers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

function formatDuration(ms) {
    if (ms <= 0) return "now";

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0 && days === 0) parts.push(`${minutes % 60}m`);

    return parts.join(" ") || "less than a minute";
}

module.exports = { formatDuration };