import BottomNav from "./BottomNav.jsx";
import Footer from "./Footer.jsx";
import FloatingIcons from "./FloatingIcons.jsx";

export default function Layout({ children }) {
    return (
        <>
            <FloatingIcons />
            <div className="layout">
                <div className="layout-content">
                    {children}
                    <Footer />
                </div>
                <BottomNav />
            </div>
        </>
    );
}