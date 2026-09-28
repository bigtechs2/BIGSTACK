import { formatDuration, truncate } from "../utils/format.js";

export default function MediaCard({ item, onClick }) {
    return (
        <div className="media-card" onClick={onClick}>
            {item.thumbnail && (
                <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="media-thumb"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />
            )}
            <div className="media-info">
                <div className="media-title">
                    {truncate(item.title || "Unknown", 60)}
                </div>
                <div className="media-meta">
                    {item.channel || item.artist || "—"}
                    {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
                </div>
            </div>
        </div>
    );
}
