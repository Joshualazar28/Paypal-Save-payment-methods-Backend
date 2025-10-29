// // src/routes/paypalPayLaterRoutes.js
// import express from "express";
// import fetch from "node-fetch";
// import { getAccessToken, PAYPAL_BASE } from "../lib/paypal-auth.js";

// const router = express.Router();

// /**
//  * POST /api/paypal/create-order
//  * Body: { value: "50.00", currency_code: "USD", reference_id?: "ride_123" }
//  */
// router.post("/create-order", async (req, res) => {
//   try {
//     const { value = "50.00", currency_code = "USD", reference_id = "ride" } = req.body || {};

//     const access = await getAccessToken();
//     const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${access}`,
//         "Content-Type": "application/json",
//         "PayPal-Request-Id": `create_${Date.now()}_${Math.random().toString(36).slice(2)}`
//       },
//       body: JSON.stringify({
//         intent: "CAPTURE",
//         purchase_units: [
//           {
//             reference_id,
//             amount: { currency_code, value }
//           }
//         ],
//         // Pay Later is a funding source the buyer picks in the popup.
//         // Experience context helps with a smoother checkout:
//         payment_source: {
//           paypal: {
//             experience_context: {
//               payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
//               brand_name: "Limo Service",
//               locale: "en-US",
//               shipping_preference: "NO_SHIPPING",
//               user_action: "PAY_NOW",
//               return_url: "https://example.com/return", // not used in JS SDK popup, but safe to include
//               cancel_url: "https://example.com/cancel"
//             }
//           }
//         }
//       })
//     });

//     const j = await r.json();
//     if (!r.ok) {
//       return res.status(400).json({ error: `create-order ${r.status}: ${JSON.stringify(j)}` });
//     }
//     res.status(201).json(j); // { id, status, links, ... }
//   } catch (e) {
//     res.status(400).json({ error: String(e.message || e) });
//   }
// });

// /**
//  * POST /api/paypal/capture-order
//  * Body: { orderID: "<id from create-order or onApprove>" }
//  */
// router.post("/capture-order", async (req, res) => {
//   try {
//     const { orderID } = req.body || {};
//     if (!orderID) return res.status(400).json({ error: "orderID is required" });

//     const access = await getAccessToken();
//     const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${access}`,
//         "Content-Type": "application/json",
//         "PayPal-Request-Id": `capture_${orderID}` // idempotent capture
//       }
//     });

//     const j = await r.json();
//     if (!r.ok) {
//       return res.status(400).json({ error: `capture-order ${r.status}: ${JSON.stringify(j)}` });
//     }
//     res.status(201).json(j); // includes capture id(s)
//   } catch (e) {
//     res.status(400).json({ error: String(e.message || e) });
//   }
// });

// export default router;
// src/routes/paypalPayLaterRoutes.js
import express from "express";
import fetch from "node-fetch";
import mongoose from "mongoose";
import { getAccessToken, PAYPAL_BASE } from "../lib/paypal-auth.js";
import { Customer } from "../models/Customer.js";
import { Transaction } from "../models/Transaction.js";

const router = express.Router();

/* ----------------------------- helpers ----------------------------- */
const ISO_CURRENCY = /^[A-Z]{3}$/;
const MONEY_2DP = /^\d+(\.\d{1,2})?$/;

function isValidObjectId(id) {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

function safeGet(obj, path, fallback = undefined) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : fallback), obj);
}

function extractOrderAmounts(orderJson) {
  const pu0 = safeGet(orderJson, "purchase_units.0", {});
  const amt = pu0.amount || {};
  return {
    value: String(amt.value || ""),
    currency_code: String(amt.currency_code || "USD"),
  };
}

function extractFirstCapture(captureJson) {
  const pu0 = safeGet(captureJson, "purchase_units.0", {});
  const payments = pu0.payments || {};
  return (payments.captures && payments.captures[0]) || null;
}

/* ------------------------------- routes ------------------------------- */

/**
 * POST /api/paypal/create-order
 * Body: { value: "50.00", currency_code: "USD", reference_id?: "ride_123", customerId?: "<mongo id>" }
 * Creates PayPal order (intent=CAPTURE) and logs Transaction(type=ORDER).
 */
router.post("/create-order", async (req, res) => {
  try {
    let {
      value = "50.00",
      currency_code = "USD",
      reference_id = "ride",
      customerId="6901f95c27fa3fa160832526"
    } = req.body || {};

    // basic validation
    currency_code = String(currency_code).toUpperCase();
    if (!ISO_CURRENCY.test(currency_code)) {
      return res.status(400).json({ error: "Invalid currency_code (ISO 4217 required)" });
    }
    if (!MONEY_2DP.test(String(value))) {
      return res.status(400).json({ error: "Invalid amount format (max 2 decimal places)" });
    }

    // optional: validate customer exists
    let customerObjId = null;
    if (customerId) {
      if (!isValidObjectId(customerId)) {
        return res.status(400).json({ error: "Invalid customerId (not an ObjectId)" });
      }
      const exists = await Customer.exists({ _id: customerId });
      if (!exists) return res.status(400).json({ error: "customerId not found" });
      customerObjId = customerId;
    }

    const access = await getAccessToken();
    const reqId = `create_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": reqId
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id,
            amount: { currency_code, value }
          }
        ],
        // Pay Later is chosen by buyer in the popup; we still provide experience context.
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "Limo Service",
              locale: "en-US",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: "https://example.com/return", // not used in SDK popup, but fine to include
              cancel_url: "https://example.com/cancel"
            }
          }
        }
      })
    });

    const j = await r.json();
    if (!r.ok) {
      return res.status(400).json({ error: `create-order ${r.status}: ${JSON.stringify(j)}` });
    }

    // Log ORDER transaction
    const { value: v, currency_code: cur } = extractOrderAmounts(j);
    await Transaction.create({
      type: "ORDER",
      intent: "CAPTURE",
      status: j.status,
      amount: v,
      currency: cur,
      orderId: j.id,
      customerId: customerObjId || undefined,
      // Pay Later doesn't use vaultId
      raw: j
    });

    res.status(201).json(j); // { id, status, links, ... }
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

/**
 * POST /api/paypal/capture-order
 * Body: { orderID: "<id from create-order/onApprove>", customerId?: "<mongo id>" }
 * Captures order and logs Transaction(type=CAPTURE).
 */
router.post("/capture-order", async (req, res) => {
  try {
    const { orderID, customerId } = req.body || {};
    if (!orderID) return res.status(400).json({ error: "orderID is required" });

    let customerObjId = null;
    if (customerId) {
      if (!isValidObjectId(customerId)) {
        return res.status(400).json({ error: "Invalid customerId (not an ObjectId)" });
      }
      // optional existence check (not strictly required here)
      const exists = await Customer.exists({ _id: customerId });
      if (!exists) return res.status(400).json({ error: "customerId not found" });
      customerObjId = customerId;
    }

    const access = await getAccessToken();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture_${orderID}` // idempotent per orderID
      }
    });

    const j = await r.json();
    if (!r.ok) {
      return res.status(400).json({ error: `capture-order ${r.status}: ${JSON.stringify(j)}` });
    }

    // Extract first capture (if multiple, you can loop)
    const cap = extractFirstCapture(j);
    const captureId = cap && cap.id;
    const amountVal = cap && safeGet(cap, "amount.value", "");
    const currency = cap && safeGet(cap, "amount.currency_code", "USD");
    const capStatus = cap && cap.status ? cap.status : j.status;

    // Log CAPTURE transaction
    await Transaction.create({
      type: "CAPTURE",
      status: capStatus,
      amount: String(amountVal || ""),
      currency: String(currency || "USD"),
      orderId: orderID,
      captureId: captureId || undefined,
      customerId: customerObjId || undefined,
      raw: j
    });

    // Best-effort: mark related ORDER as completed
    await Transaction.updateMany(
      { type: "ORDER", orderId: orderID },
      { $set: { status: "COMPLETED" } }
    );

    res.status(201).json(j); // includes capture id(s)
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

export default router;
