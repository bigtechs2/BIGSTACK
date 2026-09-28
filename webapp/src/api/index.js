// ──────────────────────────────────────────────────
//  BIGSTACK — API Endpoints
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

import client from "./client.js";

// ══════════════════════════════════════════════════
//  USER
// ══════════════════════════════════════════════════
export const userApi = {
    async me() {
        const { data } = await client.get("/user/me");
        return data;
    },
    async transactions(limit = 20) {
        const { data } = await client.get(`/user/transactions?limit=${limit}`);
        return data;
    },
    async aiMemory(limit = 50) {
        const { data } = await client.get(`/user/ai-memory?limit=${limit}`);
        return data;
    }
};

// ══════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════
export const searchApi = {
    async search(type, query) {
        const { data } = await client.post("/search", { type, query });
        return data;
    }
};

// ══════════════════════════════════════════════════
//  DAILY
// ══════════════════════════════════════════════════
export const dailyApi = {
    async status() {
        const { data } = await client.get("/daily/status");
        return data;
    },
    async claim() {
        const { data } = await client.post("/daily/claim");
        return data;
    }
};

// ══════════════════════════════════════════════════
//  STORE
// ══════════════════════════════════════════════════
export const storeApi = {
    async packages() {
        const { data } = await client.get("/store/packages");
        return data;
    }
};