import { useEffect, useState } from "react";

export default function Toast() {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        function handler(e) {
            setToast(e.detail);
            setTimeout(() => setToast(null), 3000);
        }
        window.addEventListener("bigstack:toast", handler);
        return () => window.removeEventListener("bigstack:toast", handler);
    }, []);

    if (!toast) return null;

    return (
        <div className={`toast ${toast.type || ""}`}>
            {toast.text}
        </div>
    );
}

// ─── Programmatic helper ────────────────────────────
export function showToast(text, type = "info") {
    window.dispatchEvent(
        new CustomEvent("bigstack:toast", { detail: { text, type } })
    );
}