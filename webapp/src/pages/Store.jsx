import { useEffect, useState } from "react";
import { storeApi } from "../api/index.js";
import Loader from "../components/Loader.jsx";
import { showToast } from "../components/Toast.jsx";
import { haptics } from "../telegram/haptics.js";

export default function Store() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const res = await storeApi.packages();
                setData(res);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    function buy(item) {
        haptics.success();
        showToast("Purchase via bot ⏤ /store", "success");
    }

    if (loading) return <Loader />;

    return (
        <>
            <div className="page-header">
                <div className="page-title">Store</div>
                <div className="page-subtitle">Buy coins or unlock premium</div>
            </div>

            <div className="card-title" style={{ marginBottom: 12 }}>
                ◈ Coin Packages
            </div>

            {data?.coinPackages?.map((pkg) => (
                <div
                    key={pkg.id}
                    className="media-card"
                    onClick={() => buy(pkg)}
                >
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20
                    }}>
                        🪙
                    </div>
                    <div className="media-info">
                        <div className="media-title">{pkg.label}</div>
                        <div className="media-meta">
                            {pkg.stars} ⭐  ·  {pkg.tsh}
                        </div>
                    </div>
                </div>
            ))}

            <div className="card-title" style={{ marginTop: 24, marginBottom: 12 }}>
                ★ Premium Plans
            </div>

            {data?.premiumPlans?.map((plan) => (
                <div
                    key={plan.id}
                    className="media-card"
                    onClick={() => buy(plan)}
                >
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: "var(--bg-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20
                    }}>
                        ★
                    </div>
                    <div className="media-info">
                        <div className="media-title">{plan.label}</div>
                        <div className="media-meta">
                            {plan.stars} ⭐  ·  {plan.tsh}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}