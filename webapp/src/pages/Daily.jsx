import DailyCard from "../components/DailyCard.jsx";
import { useUserStore } from "../store/user.store.js";

export default function Daily() {
    const user = useUserStore((s) => s.user);

    return (
        <>
            <div className="page-header">
                <div className="page-title">Daily Rewards</div>
                <div className="page-subtitle">
                    Claim coins every 24 hours
                </div>
            </div>

            <DailyCard />

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-title">Streak Rewards</div>
                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 2 }}>
                    <div>Day 1 ➤ +50 coins</div>
                    <div>Day 2 ➤ +55 coins</div>
                    <div>Day 3 ➤ +60 coins</div>
                    <div>Day 4 ➤ +70 coins</div>
                    <div>Day 5 ➤ +80 coins</div>
                    <div>Day 6 ➤ +90 coins</div>
                    <div>Day 7 ➤ +100 coins ★</div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6 }}>
                    Premium users get ×3 rewards
                </div>
            </div>
        </>
    );
}