import { useEffect } from "react";
import { applyPlatformTheme, resetPlatformTheme } from "../telegram/theme.js";

export function useTheme(platform = null) {
    useEffect(() => {
        if (platform) applyPlatformTheme(platform);
        else resetPlatformTheme();

        return () => resetPlatformTheme();
    }, [platform]);
}