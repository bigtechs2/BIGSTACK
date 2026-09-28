import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../utils/constants.js";
import { haptics } from "../telegram/haptics.js";

export default function BottomNav() {
    return (
        <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        "nav-item" + (isActive ? " active" : "")
                    }
                    onClick={() => haptics.light()}
                >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}