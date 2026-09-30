// ──────────────────────────────────────────────────
//  BIGSTACK — Database Client
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const mongoose = require("mongoose");
const env = require("../config/env");
const logger = require("../core/logger");

let isConnected = false;

async function connectDatabase() {
    if (isConnected) {
        logger.info("[db] already connected");
        return mongoose.connection;
    }

    try {
        logger.info("[db] connecting to MongoDB...");

        await mongoose.connect(env.mongoUrl, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });

        isConnected = true;
        logger.info(`[db] ✓ connected to ${mongoose.connection.name}`);

        mongoose.connection.on("error", (err) => {
            logger.error(`[db] error: ${err.message}`);
        });

        mongoose.connection.on("disconnected", () => {
            isConnected = false;
            logger.warn("[db] disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            isConnected = true;
            logger.info("[db] reconnected");
        });

        return mongoose.connection;

    } catch (err) {
        logger.error(`[db] ✗ connection failed: ${err.message}`);
        throw err;
    }
}

async function disconnectDatabase() {
    if (!isConnected) return;
    await mongoose.connection.close();
    isConnected = false;
    logger.info("[db] connection closed");
}

function isDbConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, disconnectDatabase, isDbConnected, mongoose };
