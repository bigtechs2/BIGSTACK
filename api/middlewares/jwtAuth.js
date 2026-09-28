// ──────────────────────────────────────────────────
//  BIGSTACK — JWT Auth Middleware
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const auth = require("../../src/services/webapp/auth.service");
const logger = require("../../src/core/logger");

function jwtAuth(req, res, next) {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.slice(7);
    const decoded = auth.verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = decoded.userId;
    req.username = decoded.username;

    next();
}

module.exports = jwtAuth;