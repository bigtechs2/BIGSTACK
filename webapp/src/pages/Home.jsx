import { Link } from "react-router-dom";
import { useUserStore } from "../store/user.store.js";
import { formatCoins } from "../utils/format.js";
import Card from "../components/Card.jsx";
import DailyCard from "../components/DailyCard.jsx";
import { NAV_ITEMS } from "../utils/constants.js";

const QUICK_ACTIONS = [
    { icon: "◇", label: "Download", path: "/downloader" },
    { icon: "◈", label: "Search",   path: "/search" },
    { icon: "★", label: "Store",    path: "/store" },
    { icon: "◉", label: "Profile",  path: "/profile" }
];

export default function Home() {
    const user = useUserStore((s) => s.user);

    return (
        <>
            <div className="page-header">
                <div className="page-title">BIGSTACK</div>
                <div className="page-subtitle">
                    Media Downloader & Search
                </div>
            </div>

            {user && (
                <Card>
                    <div className="card-title">
                        Hello, {user.firstName || "friend"}
                    </div>
                    <div className="grid-2" style={{ marginTop: 12 }}>
                        <div className="stat-card">
                            <div className="stat-value">{user.coins}</div>
                            <div className="stat-label">Coins</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">
                                {user.premium ? "★" : "○"}
                            </div>
                            <div className="stat-label">
                                {user.premium ? "Premium" : "Free"}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <DailyCard />

            <div style={{ marginTop: 20, marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                Quick Actions
            </div>

            <div className="grid-2">
                {QUICK_ACTIONS.map((action) => (
                    <Link key={action.path} to={action.path}>
                        <div className="card" style={{ textAlign: "center", padding: 20 }}>
                            <div style={{ fontSize: 28, color: "var(--accent)", marginBottom: 8 }}>
                                {action.icon}
                            </div>
                            <div style={{ fontSize: 13 }}>{action.label}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}