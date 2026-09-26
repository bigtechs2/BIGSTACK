// ──────────────────────────────────────────────────
//  BIGSTACK — API Server
//  Minimal Express server ⏤ webhook receiver only
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const logger = require("../src/core/logger");

const paymentRoutes = require("./routes/payment.routes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ───────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// ─── Root ───────────────────────────────────────────
app.get("/", (req, res) => {
    res.json({
        name: "BIGSTACK API",
        version: "1.0.0",
        purpose: "Payment webhooks for Telegram bot"
    });
});

// ─── Payment routes (webhook only) ──────────────────
app.use("/api/payment", paymentRoutes);

// ─── 404 ────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});

// ─── Error handler ──────────────────────────────────
app.use((err, req, res, next) => {
    logger.error(`[api] ${err.message}`);
    res.status(500).json({ error: "Server error" });
});

// ─── Start ──────────────────────────────────────────
function startAPI(port = 3000) {
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            logger.info(`[api] ✓ webhook server on port ${port}`);
            resolve(server);
        });
    });
}

module.exports = { app, startAPI };