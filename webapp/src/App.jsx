import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Loader from "./components/Loader.jsx";
import ForceJoin from "./components/ForceJoin.jsx";
import Toast from "./components/Toast.jsx";

import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Downloader from "./pages/Downloader.jsx";
import Player from "./pages/Player.jsx";
import Profile from "./pages/Profile.jsx";
import Daily from "./pages/Daily.jsx";
import Store from "./pages/Store.jsx";
import Settings from "./pages/Settings.jsx";
import About from "./pages/About.jsx";

import { initTelegram } from "./telegram/sdk.js";
import { useUserStore } from "./store/user.store.js";

export default function App() {
    const [ready, setReady] = useState(false);
    const { init, loading, error } = useUserStore();

    useEffect(() => {
        async function bootstrap() {
            try {
                initTelegram();
                await init();
            } catch (err) {
                console.error("Bootstrap error:", err);
            } finally {
                setReady(true);
            }
        }
        bootstrap();
    }, []);

    if (!ready || loading) return <Loader fullScreen />;
    if (error) return <ForceJoin />;

    return (
        <>
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/downloader" element={<Downloader />} />
                    <Route path="/player" element={<Player />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/daily" element={<Daily />} />
                    <Route path="/store" element={<Store />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/about" element={<About />} />
                </Routes>
            </Layout>
            <Toast />
        </>
    );
}