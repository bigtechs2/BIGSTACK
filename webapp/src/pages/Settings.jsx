import { useUserStore } from "../store/user.store.js";
import { showToast } from "../components/Toast.jsx";
import { haptics } from "../telegram/haptics.js";

export default function Settings() {
    const user = useUserStore((s) => s.user);

    function toast(msg) {
        haptics.light();
        showToast(msg, "success");
    }

    return (
        <>
            <div className="page-header">
                <div className="page-title">Settings</div>
                <div className="page-subtitle">Configure your experience</div>
            </div>

            <div className="card" onClick={() => toast("Use /settings in bot")}>
                <div className="card-title">Notifications</div>
                <div className="card-subtitle">
                    {user?.settings?.notifications !== false ? "◉ ON" : "○ OFF"}
                </div>
            </div>

            <div className="card" onClick={() => toast("Use /settings in bot")}>
                <div className="card-title">AI Voice Replies</div>
                <div className="card-subtitle">
                    {user?.settings?.aiVoiceReplies ? "◉ ON" : "○ OFF"}
                </div>
            </div>

            <div className="card" onClick={() => toast("Use /settings in bot")}>
                <div className="card-title">Dark Mode</div>
                <div className="card-subtitle">
                    {user?.settings?.darkMode !== false ? "◉ ON" : "○ OFF"}
                </div>
            </div>

            <div className="card" onClick={() => toast("Use /lang in bot")}>
                <div className="card-title">Language</div>
                <div className="card-subtitle">
                    {user?.language?.toUpperCase() || "EN"}
                </div>
            </div>
        </>
    );
}