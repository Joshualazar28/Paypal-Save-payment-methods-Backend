// src/routes/paypalRoutes.js
import express from "express";
import { createSetupToken , generateClientToken, createPaymentTokenFromSetup ,createPaymentToken } from "../lib/paypal.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
const router = express.Router();

// BELOW your existing imports…
import fetch from "node-fetch";
import dotenv from "dotenv";
import { getAccessToken } from "../lib/paypal.js";
dotenv.config();

const BASE = process.env.PAYPAL_BASE_URL;
// 1) Generate payer user-id token (id_token)
router.post("/user-id-token", async (_req, res) => {
  try {
    // PayPal OAuth with response_type=id_token (payer identity)
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const r = await fetch(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials&response_type=id_token"
    });

    const j = await r.json();
    if (!r.ok) {
      return res.status(400).json({ error: `id_token error ${r.status}: ${JSON.stringify(j)}` });
    }
    // returns { access_token, token_type, expires_in, id_token, … }
    res.status(201).json({ id_token: j.id_token });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// 2) Create SETUP TOKEN for PayPal wallet
router.post("/setup-token-paypal", async (_req, res) => {
  try {
    const accessToken = await getAccessToken();

    // For sandbox, filler return/cancel URLs are allowed by docs
    // You can point to your own pages as well.
    const payload = {
      payment_source: {
        paypal: {
          usage_type: "PLATFORM",
          experience_context: {
            return_url: "https://example.com/return",
            cancel_url: "https://example.com/cancel"
          }
        }
      }
    };

    const r = await fetch(`${BASE}/v3/vault/setup-tokens`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `st_paypal_${Date.now()}`
      },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) {
      return res.status(400).json({ error: `setup-token-paypal ${r.status}: ${JSON.stringify(j)}` });
    }
    // j.id = setup_token_id
    res.status(201).json(j);
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});



// card

/**
 * POST /api/paypal/setup-token
 * Body (optional): { brandName, locale }
 * Returns: { id, ... }
 */
router.post("/setup-token", async (req, res) => {
  try {
    const { brandName, locale } = req.body || {};
    const setup = await createSetupToken({ brandName, locale });
    res.status(201).json(setup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/client-token", async (_req, res) => {
  try {
    const token = await generateClientToken();
    res.status(201).json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Accepts either { vaultSetupToken } OR { setupTokenId }, plus optional { customerId }
router.post("/payment-token", async (req, res) => {
  try {
    const { vaultSetupToken, setupTokenId, customerId } = req.body || {};
    if (!vaultSetupToken && !setupTokenId) {
      return res.status(400).json({ error: "vaultSetupToken or setupTokenId is required" });
    }

    const pmt = await createPaymentToken({ vaultSetupToken, setupTokenId });

    let saved = null;
    if (customerId) {
      const card = pmt?.payment_source?.card || {};
      saved = await PaymentMethod.create({
        customerId,
        type: "card",
        vaultId: pmt.id,
        brand: card.brand,
        last4: card.last_digits,
        status: "active"
      });
    }

    res.status(201).json({
      vaultId: pmt.id,
      payment_source: pmt.payment_source || null,
      saved
    });
  } catch (err) {
    // send exact message
    res.status(400).json({ error: err.message || String(err) });
  }
});


export default router;