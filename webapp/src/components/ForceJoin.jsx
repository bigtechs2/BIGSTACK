import { BRAND } from "../utils/constants.js";

export default function ForceJoin() {
    return (
        <div className="force-join">
            <div className="force-join-title">
                Access Required
            </div>
            <div className="force-join-text">
                Could not verify your identity. Please open this Mini App
                through the BIGSTACK bot on Telegram.
            </div>
            <a
                href="https://t.me/BigStackBot"
                className="btn btn-primary"
                style={{ padding: "12px 32px" }}
            >
                Open BIGSTACK Bot
            </a>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 20 }}>
                {BRAND.footer}
            </div>
        </div>
    );
}