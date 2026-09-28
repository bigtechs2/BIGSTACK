// ──────────────────────────────────────────────────
//  BIGSTACK — Haptic Feedback
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

import { getWebApp } from "./sdk.js";

export function impact(style = "light") {
    try {
        getWebApp()?.HapticFeedback?.impactOccurred(style);
    } catch {}
}

export function notification(type = "success") {
    try {
        getWebApp()?.HapticFeedback?.notificationOccurred(type);
    } catch {}
}

export function selection() {
    try {
        getWebApp()?.HapticFeedback?.selectionChanged();
    } catch {}
}

// ─── Convenience ────────────────────────────────────
export const haptics = {
    light: () => impact("light"),
    medium: () => impact("medium"),
    heavy: () => impact("heavy"),
    success: () => notification("success"),
    error: () => notification("error"),
    warning: () => notification("warning"),
    select: () => selection()
};