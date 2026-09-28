import { BRAND } from "../utils/constants.js";

export default function Footer() {
    return (
        <footer className="footer">
            <div>{BRAND.footer}</div>
            <div style={{ marginTop: 4, opacity: 0.6 }}>
                v{BRAND.version}
            </div>
        </footer>
    );
}