// ──────────────────────────────────────────────────
//  BIGSTACK — SonicPesa Service
//  USSD Push for Tanzania mobile money
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const config = require("../../config");
const logger = require("../../core/logger");

const API_KEY = process.env.SONICPESA_API_KEY;
const API_URL =
    config.sonicpesa?.apiUrl ||
    "https://api.sonicpesa.com/api/v1/payment/create_order";

// ══════════════════════════════════════════════════
//  Normalize phone: 0745123456 → 255745123456
// ══════════════════════════════════════════════════
function normalizePhone(phone) {
    if (!phone) return null;

    let clean = String(phone).replace(/\D/g, "");

    if (clean.startsWith("0") && clean.length === 10) {
        clean = "255" + clean.slice(1);
    } else if (clean.startsWith("255")) {
        // already correct
    } else if (clean.length === 9) {
        clean = "255" + clean;
    }

    if (clean.length !== 12 || !clean.startsWith("255")) return null;

    return clean;
}

// ══════════════════════════════════════════════════
//  Initiate payment
// ══════════════════════════════════════════════════
async function initiatePayment({ userId, phone, amount, reference }) {
    if (!API_KEY) throw new Error("SONICPESA_API_KEY missing");

    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) throw new Error("Invalid phone number");

    const payload = {
        buyer_email: `${cleanPhone}@bigstack.app`,
        buyer_name: `BIGSTACK User ${userId}`,
        buyer_phone: cleanPhone,
        amount: parseInt(amount),
        currency: config.sonicpesa?.currency || "TZS"
    };

    logger.info(`[sonicpesa] initiating:`, {
        phone: cleanPhone,
        amount: payload.amount
    });

    try {
        const { data } = await axios.post(API_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": API_KEY
            },
            timeout: config.sonicpesa?.timeoutMs || 45000
        });

        if (data?.status === "success") {
            return {
                success: true,
                orderId: data.data?.order_id || data.data?.reference || reference,
                reference,
                raw: data
            };
        }

        return {
            success: false,
            message: data?.message || "Initiation failed"
        };

    } catch (error) {
        const msg = error.response
            ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
            : error.message;

        logger.error(`[sonicpesa] failed: ${msg}`);

        throw new Error(error.response?.data?.message || "Gateway unavailable");
    }
}

// ══════════════════════════════════════════════════
//  Verify webhook
// ══════════════════════════════════════════════════
function verifyWebhook(body) {
    if (!body || typeof body !== "object") return false;
    const status = body.status || body.payment_status;
    const ref = body.reference || body.order_id || body.data?.reference;
    return !!(status && ref);
}

// ══════════════════════════════════════════════════
//  Parse webhook
// ══════════════════════════════════════════════════
function parseWebhook(body) {
    const d = body.data || body;
    const status = String(d.status || d.payment_status || "").toLowerCase();

    return {
        status,
        reference: d.reference || d.order_id || d.transaction_reference,
        amount: parseInt(d.amount) || 0,
        transactionId: d.transaction_id || d.mpesa_receipt || d.receipt,
        phone: d.buyer_phone || d.phone,
        isSuccess: ["success", "completed", "paid"].includes(status),
        isFailed: ["failed", "cancelled", "cancelled_by_user", "declined"].includes(status)
    };
}

module.exports = {
    initiatePayment,
    normalizePhone,
    verifyWebhook,
    parseWebhook
};