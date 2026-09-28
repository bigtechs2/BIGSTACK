import { useState } from "react";
import { searchApi } from "../api/index.js";
import MediaCard from "../components/MediaCard.jsx";
import Loader from "../components/Loader.jsx";
import { haptics } from "../telegram/haptics.js";

const TYPES = [
    { id: "spotifysearch", label: "Spotify" },
    { id: "applesearch",   label: "Apple" },
    { id: "youtubesearch", label: "YouTube" },
    { id: "imagesearch",   label: "Images" },
    { id: "happymod",      label: "APKs" },
    { id: "lyrics",        label: "Lyrics" }
];

export default function Search() {
    const [type, setType] = useState("spotifysearch");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    async function doSearch() {
        if (!query.trim()) return;
        setLoading(true);
        haptics.light();
        try {
            const data = await searchApi.search(type, query);
            const list = data.result?.results || data.result || [];
            setResults(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="page-header">
                <div className="page-title">Search</div>
                <div className="page-subtitle">Find music, movies, images</div>
            </div>

            <div className="grid-3" style={{ marginBottom: 16 }}>
                {TYPES.map((t) => (
                    <button
                        key={t.id}
                        className={"btn" + (type === t.id ? " btn-primary" : "")}
                        style={{ padding: "8px 12px", fontSize: 12 }}
                        onClick={() => { setType(t.id); haptics.select(); }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="search-input-wrap">
                <span className="search-icon">◈</span>
                <input
                    className="search-input"
                    type="text"
                    value={query}
                    placeholder={`Search ${TYPES.find((t) => t.id === type)?.label}...`}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doSearch()}
                />
            </div>

            <button className="btn btn-primary btn-full" onClick={doSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
            </button>

            <div style={{ marginTop: 20 }}>
                {loading && <Loader />}

                {!loading && results.length === 0 && query && (
                    <div className="empty">
                        <div className="empty-icon">◈</div>
                        <div className="empty-text">No results</div>
                    </div>
                )}

                {!loading && results.map((item, i) => (
                    <MediaCard key={i} item={item} onClick={() => haptics.light()} />
                ))}
            </div>
        </>
    );
}