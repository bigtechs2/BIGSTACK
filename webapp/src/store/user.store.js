// ──────────────────────────────────────────────────
//  BIGSTACK — User Store (Zustand)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

import { create } from "zustand";
import { authenticate } from "../api/client.js";
import { userApi } from "../api/index.js";
import { storage, KEYS } from "../utils/storage.js";

export const useUserStore = create((set, get) => ({
    // ─── State ──────────────────────────────────────
    user: storage.get(KEYS.USER, null),
    loading: false,
    error: null,

    // ─── Initialize ⏤ auth + fetch profile ──────────
    async init() {
        set({ loading: true, error: null });
        try {
            await authenticate();
            const { user } = await userApi.me();
            storage.set(KEYS.USER, user);
            set({ user, loading: false });
        } catch (err) {
            console.error("[user.store] init failed:", err.message);
            set({ error: err.message, loading: false });
        }
    },

    // ─── Refresh ────────────────────────────────────
    async refresh() {
        try {
            const { user } = await userApi.me();
            storage.set(KEYS.USER, user);
            set({ user });
        } catch (err) {
            console.warn("[user.store] refresh failed:", err.message);
        }
    },

    // ─── Logout ─────────────────────────────────────
    logout() {
        storage.remove(KEYS.TOKEN);
        storage.remove(KEYS.USER);
        set({ user: null });
    }
}));