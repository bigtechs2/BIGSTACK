// ──────────────────────────────────────────────────
//  BIGSTACK — Logger
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const pino = require("pino");
const path = require("path");
const fs = require("fs");
const env = require("../config/env");
const branding = require("../config/branding");

// ─── Ensure logs folder exists ──────────────────────
const logsDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ─── Build logger ───────────────────────────────────
const logger = pino({
    level: env.isDev ? "debug" : "info",

    // ─── Pretty output in dev ───────────────────────
    transport: env.isDev
        ? {
              target: "pino-pretty",
              options: {
                  colorize: true,
                  translateTime: "HH:MM:ss",
                  ignore: "pid,hostname",
                  messageFormat: "{msg}"
              }
          }
        : undefined,

    // ─── Write to file in production ────────────────
    ...(env.isProd && {
        destination: path.join(logsDir, "bigstack.log")
    }),

    // ─── Base fields ────────────────────────────────
    base: {
        app: branding.branding?.name || "BIGSTACK",
        version: branding.branding?.version || "1.0.0"
    }
});

// ─── Startup marker ─────────────────────────────────
logger.info("─────────────────────────────────────────────");
logger.info(`${branding.branding?.name || "BIGSTACK"} logger initialized`);
logger.info(`Mode: ${env.nodeEnv} | Level: ${env.isDev ? "debug" : "info"}`);
logger.info("─────────────────────────────────────────────");

// ─── Export ─────────────────────────────────────────
module.exports = logger;