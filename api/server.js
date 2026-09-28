// ──────────────────────────────────────────────────
//  BIGSTACK — API Server
//  Webhooks + Mini App backend
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const logger = require("../src/core/logger");

// ══════════════════════════════════════════════════
//  Route imports
// ══════════════════════════════════════════════════
const paymentRoutes = require("./routes/payment.routes");
const authRoutes    = require("./routes/auth.routes");
const userRoutes    = require("./routes/user.routes");
const rewardRoutes  = require("./routes/reward.routes");

// ══════════════════════════════════════════════════
//  Create app
// ══════════════════════════════════════════════════
const app = express();

// ─── Middleware ─────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logger (debug mode only) ───────────────
app.use((req, res, next) => {
    if (process.env.NODE_ENV === "development") {
        logger.debug(`[api] ${req.method} ${req.path}`);
    }
    next();
});

// ══════════════════════════════════════════════════
//  System Routes
// ══════════════════════════════════════════════════

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
        purpose: "Telegram bot webhooks + Mini App backend",
        endpoints: {
            auth:    "/api/auth",
            user:    "/api/user",
            reward:  "/api/reward",
            payment: "/api/payment",
            health:  "/health"
        }
    });
});

// ══════════════════════════════════════════════════
//  API Routes
// ══════════════════════════════════════════════════
app.use("/api/auth",    authRoutes);
app.use("/api/user",    userRoutes);
app.use("/api/reward",  rewardRoutes);
app.use("/api/payment", paymentRoutes);

// ══════════════════════════════════════════════════
//  404 handler
// ══════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({
        error: "Not found",
        path: req.path
    });
});

// ══════════════════════════════════════════════════
//  Error handler
// ══════════════════════════════════════════════════
app.use((err, req, res, next) => {
    logger.error(`[api] ${req.method} ${req.path}: ${err.message}`);
    res.status(500).json({ error: "Server error" });
});

// ══════════════════════════════════════════════════
//  Start
// ══════════════════════════════════════════════════
function startAPI(port = 3000) {
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            logger.info(`[api] ✓ server listening on port ${port}`);
            logger.info(`[api]   auth:    /api/auth`);
            logger.info(`[api]   user:    /api/user/me`);
            logger.info(`[api]   reward:  /api/reward/daily`);
            logger.info(`[api]   payment: /api/payment/webhook`);
            logger.info(`[api]   health:  /health`);
            resolve(server);
        });
    });
}

module.exports = { app, startAPI };