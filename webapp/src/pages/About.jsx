import { BRAND } from "../utils/constants.js";

export default function About() {
    return (
        <>
            <div className="page-header">
                <div className="page-title">About</div>
                <div className="page-subtitle">{BRAND.tagline}</div>
            </div>

            <div className="card">
                <div className="card-title">{BRAND.name}</div>
                <div className="card-subtitle">
                    Version {BRAND.version}
                </div>
                <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.8 }}>
                    <div>◈ 16 download platforms</div>
                    <div>◉ 9 search commands</div>
                    <div>▣ AI assistant</div>
                    <div>★ Coin economy</div>
                    <div>☆ Premium tier</div>
                </div>
            </div>

            <div className="card">
                <div className="card-title">Developer</div>
                <div className="card-subtitle">bigmanjtech</div>
                <a
                    href="https://t.me/bigmanj09"
                    className="btn btn-primary btn-full"
                    style={{ marginTop: 12 }}
                >
                    Contact
                </a>
            </div>

            <div style={{ textAlign: "center", marginTop: 40, opacity: 0.5, fontSize: 12 }}>
                {BRAND.footer}
            </div>
        </>
    );
}