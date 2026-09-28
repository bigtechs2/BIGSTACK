export default function Player() {
    return (
        <>
            <div className="page-header">
                <div className="page-title">Player</div>
                <div className="page-subtitle">Your active media queue</div>
            </div>
            <div className="empty">
                <div className="empty-icon">▣</div>
                <div className="empty-text">
                    Nothing playing
                    <br />
                    <span style={{ fontSize: 12, opacity: 0.6 }}>
                        Downloads appear here
                    </span>
                </div>
            </div>
        </>
    );
}