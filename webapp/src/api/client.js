// ──────────────────────────────────────────────────
//  BIGSTACK — API Client
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

import axios from "axios";
import { API_BASE } from "../utils/constants.js";
import { storage, KEYS } from "../utils/storage.js";
import { getInitData } from "../telegram/sdk.js";

// ─── Axios instance ─────────────────────────────────
const client = axios.create({
    baseURL: API_BASE,
    timeout: 60000,
    headers: { "Content-Type": "application/json" }
});

// ─── Request interceptor ⏤ add JWT ──────────────────
client.interceptors.request.use((config) => {
    const token = storage.get(KEYS.TOKEN);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Response interceptor ⏤ handle 401 ──────────────
client.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            storage.remove(KEYS.TOKEN);
            storage.remove(KEYS.USER);
        }
        return Promise.reject(err);
    }
);

// ─── Auth helper ────────────────────────────────────
export async function authenticate() {
    const initData = getInitData();
    if (!initData) throw new Error("Not in Telegram");

    const { data } = await client.post("/auth", { initData });
    if (!data.success) throw new Error("Auth failed");

    storage.set(KEYS.TOKEN, data.token);
    storage.set(KEYS.USER, data.user);

    return data.user;
}

export default client;