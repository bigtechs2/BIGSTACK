import { useEffect, useState } from "react";
import { getWebApp, getUser, isTelegram } from "../telegram/sdk.js";

export function useTelegram() {
    const [tg, setTg] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        setTg(getWebApp());
        setUser(getUser());
    }, []);

    return {
        webApp: tg,
        user,
        isTelegram: isTelegram(),
        close: () => tg?.close(),
        expand: () => tg?.expand()
    };
}