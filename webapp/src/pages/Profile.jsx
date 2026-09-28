import { useUserStore } from "../store/user.store.js";
import { formatNumber, formatDate } from "../utils/format.js";

export default function Profile() {
    const user = useUserStore((s) => s.user);
    if (!user) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-title">Profile</div>
                <div className="page-subtitle">
                    @{user.username || "no-username"}
                </div>
            </div>

            <div className="grid-2">
                <div className="stat-card">
                    <div className="stat-value">{formatNumber(user.coins)}</div>
                    <div className="stat-label">Coins</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">
                        {user.premium ? "★" : "○"}
                    </div>
                    <div className="stat-label">Premium</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{user.streakDays || 0}</div>
                    <div className="stat-label">Streak</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{user.referralCount || 0}</div>
                    <div className="stat-label">Referrals</div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-title">Activity</div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ opacity: 0.6 }}>Commands</span>
                        <span>{formatNumber(user.totalCommands || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ opacity: 0.6 }}>Downloads</span>
                        <span>{formatNumber(user.totalDownloads || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ opacity: 0.6 }}>Member since</span>
                        <span>{formatDate(user.createdAt)}</span>
                    </div>
                </div>
            </div>
        </>
    );
}