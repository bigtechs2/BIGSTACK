import { useEffect, useState } from "react";
import { dailyApi } from "../api/index.js";
import { useUserStore } from "../store/user.store.js";
import { haptics } from "../telegram/haptics.js";

export function useDaily() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const refresh = useUserStore((s) => s.refresh);

    async function loadStatus() {
        try {
            const data = await dailyApi.status();
            setStatus(data);
        } catch (err) {
            console.warn("[useDaily] status failed:", err.message);
        }
    }

    async function claim() {
        setLoading(true);
        setMessage(null);
        try {
            const data = await dailyApi.claim();
            haptics.success();
            setMessage({
                type: "success",
                text: `+${data.reward} coins · streak ${data.streak}`
            });
            await refresh();
            await loadStatus();
        } catch (err) {
            haptics.error();
            const msg = err.response?.data?.error || err.message;
            setMessage({ type: "error", text: msg });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadStatus();
    }, []);

    return { status, loading, message, claim, reload: loadStatus };
}