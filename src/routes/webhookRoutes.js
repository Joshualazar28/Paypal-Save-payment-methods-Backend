import express from "express";
import dotenv from "dotenv";
import { getAccessToken } from "../lib/paypal.js";
import { saveTx } from "../lib/tx.js";

dotenv.config();
const router = express.Router();

const BASE = process.env.PAYPAL_BASE_URL;
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

// Raw body needed for signature
router.use(express.json({ type: "*/*" }));

async function verifySignature(req, body) {
  const accessToken = await getAccessToken();
  const verifyPayload = {
    transmission_id: req.header("paypal-transmission-id"),
    transmission_time: req.header("paypal-transmission-time"),
    cert_url: req.header("paypal-cert-url"),
    auth_algo: req.header("paypal-auth-algo"),
    transmission_sig: req.header("paypal-transmission-sig"),
    webhook_id: WEBHOOK_ID,
    webhook_event: body
  };

  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(verifyPayload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`webhook verify error ${res.status}: ${JSON.stringify(data)}`);
  return data?.verification_status === "SUCCESS";
}

router.post("/", async (req, res) => {
  try {
    if (!WEBHOOK_ID) return res.status(500).json({ error: "PAYPAL_WEBHOOK_ID missing" });

    const body = req.body;
    const ok = await verifySignature(req, body);
    if (!ok) return res.status(400).json({ error: "Invalid webhook signature" });

    const eventType = body?.event_type;
    const resource  = body?.resource || {};
    // Map well-known events to our Transaction model
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      await saveTx({
        type: "CAPTURE",
        status: resource?.status,
        amount: resource?.amount?.value,
        currency: resource?.amount?.currency_code,
        captureId: resource?.id,
        raw: body
      });
    } else if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      await saveTx({
        type: "REFUND",
        status: resource?.status,
        amount: resource?.amount?.value,
        currency: resource?.amount?.currency_code,
        captureId: resource?.refund_from_transaction_id,
        refundId: resource?.id,
        raw: body
      });
    } else if (eventType === "PAYMENT.AUTHORIZATION.VOIDED") {
      await saveTx({
        type: "VOID",
        status: "VOIDED",
        authorizationId: resource?.id,
        raw: body
      });
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("[webhook] error", e);
    res.status(400).json({ error: String(e.message || e) });
  }
});

export default router;
