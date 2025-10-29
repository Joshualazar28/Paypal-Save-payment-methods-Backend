// // src/routes/paypalRoutes.js
// import express from "express";
// import { createSetupToken , generateClientToken, createPaymentTokenFromSetup ,createPaymentToken } from "../lib/paypal.js";
// import { PaymentMethod } from "../models/PaymentMethod.js";
// const router = express.Router();

// // BELOW your existing imports…
// import fetch from "node-fetch";
// import dotenv from "dotenv";
// import { getAccessToken } from "../lib/paypal.js";
// dotenv.config();

// const BASE = process.env.PAYPAL_BASE_URL;
// // 1) Generate payer user-id token (id_token)
// router.post("/user-id-token", async (_req, res) => {
//   try {
//     // PayPal OAuth with response_type=id_token (payer identity)
//     const auth = Buffer.from(
//       `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
//     ).toString("base64");

//     const r = await fetch(`${BASE}/v1/oauth2/token`, {
//       method: "POST",
//       headers: {
//         "Authorization": `Basic ${auth}`,
//         "Content-Type": "application/x-www-form-urlencoded"
//       },
//       body: "grant_type=client_credentials&response_type=id_token"
//     });

//     const j = await r.json();
//     if (!r.ok) {
//       return res.status(400).json({ error: `id_token error ${r.status}: ${JSON.stringify(j)}` });
//     }
//     // returns { access_token, token_type, expires_in, id_token, … }
//     res.status(201).json({ id_token: j.id_token });
//   } catch (e) {
//     res.status(400).json({ error: String(e.message || e) });
//   }
// });

// // 2) Create SETUP TOKEN for PayPal wallet
// router.post("/setup-token-paypal", async (_req, res) => {
//   try {
//     const accessToken = await getAccessToken();
//     const payload = {
//       payment_source: {
//         paypal: {
//           usage_type: "MERCHANT", // <-- FIX (JS SDK flow)
//           experience_context: {
//             return_url: "https://example.com/return",
//             cancel_url: "https://example.com/cancel",
//             // optional but nice:
//             // brand_name: "Your Brand",
//             // locale: "en-US"
//           }
//         }
//       }
//     };

//     const r = await fetch(`${BASE}/v3/vault/setup-tokens`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//         "PayPal-Request-Id": `st_paypal_${Date.now()}`
//       },
//       body: JSON.stringify(payload)
//     });
//     const j = await r.json();
//     if (!r.ok) return res.status(400).json({ error: `setup-token-paypal ${r.status}: ${JSON.stringify(j)}` });
//     res.status(201).json(j); // { id, status: PAYER_ACTION_REQUIRED, links[...] }
//   } catch (e) {
//     res.status(400).json({ error: String(e.message || e) });
//   }
// });




// // card

// /**
//  * POST /api/paypal/setup-token
//  * Body (optional): { brandName, locale }
//  * Returns: { id, ... }
//  */
// router.post("/setup-token", async (req, res) => {
//   try {
//     const { brandName, locale } = req.body || {};
//     const setup = await createSetupToken({ brandName, locale });
//     res.status(201).json(setup);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// router.post("/client-token", async (_req, res) => {
//   try {
//     const token = await generateClientToken();
//     res.status(201).json(token);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // Accepts either { vaultSetupToken } OR { setupTokenId }, plus optional { customerId }
// // changes--joshua1 
// // router.post("/payment-token", async (req, res) => {
// //   try {
// //     const { vaultSetupToken, setupTokenId, customerId } = req.body || {};
// //     const setup = vaultSetupToken || setupTokenId;
// //     if (!setup) return res.status(400).json({ error: "vaultSetupToken or setupTokenId is required" });

// //     const pmt = await createPaymentToken({ vaultSetupToken: setup });

// //     let saved = null;
// //     if (customerId) {
// //       // PayPal wallet → payment_source.paypal
// //       const isCard = !!pmt?.payment_source?.card;
// //       const isPaypal = !!pmt?.payment_source?.paypal;

// //       saved = await PaymentMethod.create({
// //         customerId,
// //         type: isCard ? "card" : (isPaypal ? "paypal" : "unknown"),
// //         vaultId: pmt.id,
// //         brand: isCard ? pmt.payment_source.card.brand : undefined,
// //         last4: isCard ? pmt.payment_source.card.last_digits : undefined,
// //         status: "active"
// //       });
// //     }

// //     res.status(201).json({ vaultId: pmt.id, payment_source: pmt.payment_source || null, saved });
// //   } catch (err) {
// //     res.status(400).json({ error: err.message || String(err) });
// //   }
// // });

// router.post("/payment-token", async (req, res) => {
//   try {
//     const { vaultSetupToken, setupTokenId, customerId } = req.body || {};
//     const setup = vaultSetupToken || setupTokenId;
//     if (!setup) return res.status(400).json({ error: "vaultSetupToken or setupTokenId is required" });

//     const pmt = await createPaymentToken({ vaultSetupToken: setup });

//     let saved = null;
//     if (customerId) {
//       // PayPal wallet → payment_source.paypal
//       const isCard = !!pmt?.payment_source?.card;
//       const isPaypal = !!pmt?.payment_source?.paypal;

//       saved = await PaymentMethod.create({
//         customerId,
//         type: isCard ? "card" : (isPaypal ? "paypal" : "unknown"),
//         vaultId: pmt.id,
//         brand: isCard ? pmt.payment_source.card.brand : undefined,
//         last4: isCard ? pmt.payment_source.card.last_digits : undefined,
//         status: "active"
//       });
//     }

//     res.status(201).json({ vaultId: pmt.id, payment_source: pmt.payment_source || null, saved });
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });



// export default router;

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { createSetupToken , generateClientToken  } from "../lib/paypal.js";

dotenv.config();
const router = express.Router();

const BASE = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// -------- lib-style helpers --------
async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const j = await r.json();
  if (!r.ok || !j?.access_token) {
    throw new Error(`oauth ${r.status}: ${JSON.stringify(j)}`);
  }
  return j.access_token;
}

// Exchange setup token -> payment token
async function createPaymentToken({ vaultSetupToken }) {
  const accessToken = await getAccessToken();
  const r = await fetch(`${BASE}/v3/vault/payment-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `pt_${Date.now()}`
    },
    body: JSON.stringify({
      payment_source: {
        token: { id: vaultSetupToken, type: "SETUP_TOKEN" }
      }
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`payment-token ${r.status}: ${JSON.stringify(j)}`);
  return j;
}

// -------- routes --------

// 1) Payer id_token for JS SDK (identity context)
router.post("/user-id-token", async (_req, res) => {
  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const r = await fetch(`${BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      // IMPORTANT: response_type=id_token along with client_credentials
      body: "grant_type=client_credentials&response_type=id_token"
    });
    const j = await r.json();
    if (!r.ok || !j?.id_token) {
      return res.status(400).json({ error: `id_token error ${r.status}: ${JSON.stringify(j)}` });
    }
    res.status(201).json({ id_token: j.id_token });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// 2) Create SETUP TOKEN for PayPal wallet
router.post("/setup-token-paypal", async (_req, res) => {
  try {
    const accessToken = await getAccessToken();
    const payload = {
      payment_source: {
        paypal: {
          usage_type: "MERCHANT", // JS SDK "save for later" merchant flow
          experience_context: {
            return_url: "https://example.com/return",
            cancel_url: "https://example.com/cancel",
            // brand_name: "Your Brand",
            // locale: "en-US"
          }
        }
      }
    };

    const r = await fetch(`${BASE}/v3/vault/setup-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `st_paypal_${Date.now()}`
      },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok || !j?.id) {
      return res.status(400).json({ error: `setup-token ${r.status}: ${JSON.stringify(j)}` });
    }
    res.status(201).json(j); // { id, status, links[] }
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});



// 3) Exchange setup -> payment token, save to DB
router.post("/payment-token", async (req, res) => {
  try {
    const { vaultSetupToken, setupTokenId, customerId } = req.body || {};
    const setup = vaultSetupToken || setupTokenId;
    if (!setup) return res.status(400).json({ error: "vaultSetupToken or setupTokenId is required" });

    const pmt = await createPaymentToken({ vaultSetupToken: setup });

    // let saved = null;
const isCard = !!pmt?.payment_source?.card;
const isPaypal = !!pmt?.payment_source?.paypal;

const docToSet = {
  customerId,
  type: isCard ? "card" : (isPaypal ? "paypal" : "unknown"),
  brand: isCard ? pmt.payment_source.card.brand : undefined,
  last4: isCard ? pmt.payment_source.card.last_digits : undefined,
  email: isPaypal ? pmt.payment_source.paypal?.email_address : undefined,
  status: "active"
};

// Idempotent write by vaultId
const saved = await PaymentMethod.findOneAndUpdate(
  { vaultId: pmt.id },
  { $set: docToSet, $setOnInsert: { vaultId: pmt.id } },
  { new: true, upsert: true }
);

return res.status(201).json({
  vaultId: pmt.id,
  payment_source: pmt.payment_source || null,
  saved
});
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
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


//  Create SETUP TOKEN for PayPal card
router.post("/setup-token", async (req, res) => {
  try {
    const { brandName, locale } = req.body || {};
    const setup = await createSetupToken({ brandName, locale });
    res.status(201).json(setup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


export default router;
