// ──────────────────────────────────────────────────
//  BIGSTACK — Telegram WebApp SDK
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

let webApp = null;

export function initTelegram() {
    try {
        if (window.Telegram?.WebApp) {
            webApp = window.Telegram.WebApp;
            webApp.ready();
            webApp.expand();
            webApp.disableVerticalSwipes?.();

            document.documentElement.style.setProperty(
                "--tg-bg",
                webApp.themeParams?.bg_color || "#0f0f0f"
            );

            console.log("[Telegram] WebApp initialized");
        } else {
            console.warn("[Telegram] SDK not available ⏤ running in browser");
        }
    } catch (err) {
        console.error("[Telegram] init failed:", err);
    }
}

export function getWebApp() {
    return webApp || window.Telegram?.WebApp || null;
}

export function getInitData() {
    const tg = getWebApp();
    return tg?.initData || "";
}

export function getUser() {
    const tg = getWebApp();
    return tg?.initDataUnsafe?.user || null;
}

export function isTelegram() {
    return !!getWebApp()?.initData;
}

export function expand() {
    getWebApp()?.expand();
}

export function close() {
    getWebApp()?.close();
}

export function showBackButton(handler) {
    const tg = getWebApp();
    if (!tg?.BackButton) return;
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
}

export function hideBackButton() {
    getWebApp()?.BackButton?.hide();
}