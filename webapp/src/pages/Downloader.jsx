import { useState } from "react";
import { PLATFORMS } from "../utils/constants.js";
import { showToast } from "../components/Toast.jsx";
import { useTheme } from "../hooks/useTheme.js";
import { haptics } from "../telegram/haptics.js";

export default function Downloader() {
    const [selected, setSelected] = useState(null);
    const [url, setUrl] = useState("");

    useTheme(selected?.id);

    function submit() {
        if (!url.trim()) return;
        haptics.success();
        showToast("Download queued ⏤ check the bot", "success");
        setUrl("");
    }

    return (
        <>
            <div className="page-header">
                <div className="page-title">Downloader</div>
                <div className="page-subtitle">Pick a platform, paste a link</div>
            </div>

            <div className="grid-3" style={{ marginBottom: 20 }}>
                {PLATFORMS.map((p) => (
                    <button
                        key={p.id}
                        className={"card" + (selected?.id === p.id ? " active" : "")}
                        style={{
                            padding: 12,
                            textAlign: "center",
                            borderColor:
                                selected?.id === p.id
                                    ? "var(--accent)"
                                    : "var(--border-color)"
                        }}
                        onClick={() => { setSelected(p); haptics.select(); }}
                    >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                        <div style={{ fontSize: 11 }}>{p.name}</div>
                    </button>
                ))}
            </div>

            {selected && (
                <>
                    <div className="search-input-wrap">
                        <span className="search-icon">🔗</span>
                        <input
                            className="search-input"
                            type="text"
                            value={url}
                            placeholder={`Paste ${selected.name} link...`}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>

                    <button className="btn btn-primary btn-full" onClick={submit}>
                        Download from {selected.name}
                    </button>
                </>
            )}

            {!selected && (
                <div className="empty">
                    <div className="empty-icon">◇</div>
                    <div className="empty-text">
                        Choose a platform to begin
                    </div>
                </div>
            )}
        </>
    );
}