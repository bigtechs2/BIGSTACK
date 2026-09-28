import { useEffect, useState } from "react";
import { useDaily } from "../hooks/useDaily.js";
import { formatDuration } from "../utils/format.js";

export default function DailyCard() {
    const { status, loading, message, claim } = useDaily();

    if (!status) return null;

    const canClaim = status.canClaim;
    const reward = status.premiumReward || status.nextReward;

    return (
        <div className="card">
            <div className="card-title">
                {canClaim ? "☆ Daily Reward Ready" : "◐ Daily Reward"}
            </div>
            <div className="card-subtitle" style={{ marginBottom: 12 }}>
                {canClaim
                    ? `Claim +${reward} coins now`
                    : `Come back in ${formatDuration((status.remainingMs || 0) / 1000)}`}
            </div>

            {canClaim && (
                <button
                    className="btn btn-primary btn-full"
                    onClick={claim}
                    disabled={loading}
                >
                    {loading ? "Claiming..." : `Claim +${reward} coins`}
                </button>
            )}

            {message && (
                <div
                    style={{
                        marginTop: 12,
                        fontSize: 13,
                        color:
                            message.type === "success"
                                ? "var(--accent-green)"
                                : "var(--accent-red)"
                    }}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}