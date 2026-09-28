import { useEffect } from "react";
import { useUserStore } from "../store/user.store.js";

export function useUser() {
    const { user, loading, error, refresh } = useUserStore();

    useEffect(() => {
        if (!user) refresh();
    }, []);

    return { user, loading, error, refresh };
}