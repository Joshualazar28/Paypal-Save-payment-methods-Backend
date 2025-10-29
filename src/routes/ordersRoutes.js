// // src/routes/ordersRoutes.js
// import express from "express";
// import {
//   createOrderWithToken,
//   captureOrder,
//   authorizeOrder,
//   captureAuthorization,
//   voidAuthorization,
//   refundCapture
// } from "../lib/paypal-orders.js";
// import { saveTx } from "../lib/tx.js";
// import { getOrder } from "../lib/paypal-orders.js"; // you added this earlier

// const router = express.Router();

// /**
//  * POST /api/orders/charge
//  * Body: { vaultId, amount, currency?, idempotencyKey? }
//  * Flow: Create order (intent=CAPTURE) -> capture -> return captureId
//  */
// router.post("/charge", async (req, res) => {
//   try {
//     const { vaultId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
//     if (!vaultId || !amount) return res.status(400).json({ error: "vaultId and amount are required" });

//     const orderKey = idempotencyKey ? `${idempotencyKey}_order` : undefined;
//     const capKey   = idempotencyKey ? `${idempotencyKey}_capture` : undefined;

//     const order = await createOrderWithToken({ vaultId, intent: "CAPTURE", amount, currency, idempotencyKey: orderKey });

//     const pickCapture = (obj) => obj?.purchase_units?.[0]?.payments?.captures?.[0] || null;
//     let capture = pickCapture(order);
//     let capturedRes = null;

//     if (!capture) {
//       try {
//         capturedRes = await captureOrder(order.id, capKey);
//         capture = pickCapture(capturedRes);
//       } catch (e) {
//         if (String(e?.message || e).includes("ORDER_ALREADY_CAPTURED")) {
//           const fetched = await getOrder(order.id);
//           capture = pickCapture(fetched);
//         } else {
//           throw e;
//         }
//       }
//     }

//     if (!capture) return res.status(400).json({ error: "No capture returned from PayPal" });

//     // persist
//     await saveTx({
//       type: "ORDER", intent: "CAPTURE", status: order.status, amount, currency, orderId: order.id, vaultId, customerId, raw: order
//     });
//     await saveTx({
//       type: "CAPTURE", status: capture.status, amount: capture?.amount?.value, currency: capture?.amount?.currency_code,
//       orderId: order.id, captureId: capture.id, vaultId, customerId, raw: { order, capturedRes }
//     });

//     res.status(201).json({
//       orderId: order.id,
//       status: capture.status || "COMPLETED",
//       captureId: capture.id,
//       amount: capture?.amount,
//       raw: { order, capturedRes }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });



// /**
//  * POST /api/orders/authorize
//  * Body: { vaultId, amount, currency?, idempotencyKey? }
//  * Returns authorizationId
//  */
// router.post("/authorize", async (req, res) => {
//   try {
//     const { vaultId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
//     if (!vaultId || !amount) return res.status(400).json({ error: "vaultId and amount are required" });

//     const orderKey = idempotencyKey ? `${idempotencyKey}_order` : undefined;
//     const authKey  = idempotencyKey ? `${idempotencyKey}_auth`  : undefined;

//     const order = await createOrderWithToken({ vaultId, intent: "AUTHORIZE", amount, currency, idempotencyKey: orderKey });

//     const pickAuth = (obj) => obj?.purchase_units?.[0]?.payments?.authorizations?.[0] || null;

//     let authorization = pickAuth(order);
//     let authRes = null;
//     if (!authorization) {
//       try {
//         authRes = await authorizeOrder(order.id, authKey);
//         authorization = pickAuth(authRes);
//       } catch (e) {
//         if (String(e?.message || e).includes("ORDER_ALREADY_AUTHORIZED")) {
//           const fetched = await getOrder(order.id);
//           authorization = pickAuth(fetched);
//         } else {
//           throw e;
//         }
//       }
//     }

//     if (!authorization) return res.status(400).json({ error: "No authorization returned from PayPal" });

//     // persist
//     await saveTx({
//       type: "ORDER", intent: "AUTHORIZE", status: order.status, amount, currency, orderId: order.id, vaultId, customerId, raw: order
//     });
//     await saveTx({
//       type: "AUTHORIZATION", status: authorization.status, amount, currency,
//       orderId: order.id, authorizationId: authorization.id, vaultId, customerId, raw: { order, authRes }
//     });

//     res.status(201).json({
//       orderId: order.id,
//       authorizationId: authorization.id,
//       status: authorization.status,
//       raw: { order, authRes }
//     });
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });


// /**
//  * POST /api/orders/capture-authorization
//  * Body: { authorizationId, amount?, currency?, idempotencyKey? }
//  */
// router.post("/capture-authorization", async (req, res) => {
//   try {
//     const { authorizationId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
//     if (!authorizationId) return res.status(400).json({ error: "authorizationId is required" });

//     const cap = await captureAuthorization(authorizationId, { amount, currency, idempotencyKey });

//     await saveTx({
//       type: "CAPTURE", status: cap?.status, amount: cap?.amount?.value, currency: cap?.amount?.currency_code,
//       captureId: cap?.id, authorizationId, customerId, raw: cap
//     });

//     res.status(201).json({ captureId: cap?.id, status: cap?.status, raw: cap });
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });


// /**
//  * POST /api/orders/void-authorization
//  * Body: { authorizationId, idempotencyKey? }
//  */
// router.post("/void-authorization", async (req, res) => {
//   try {
//     const { authorizationId, idempotencyKey, customerId } = req.body || {};
//     if (!authorizationId) return res.status(400).json({ error: "authorizationId is required" });

//     const out = await voidAuthorization(authorizationId, idempotencyKey);

//     await saveTx({
//       type: "VOID", status: out.status, authorizationId, customerId, raw: out
//     });

//     res.status(200).json(out);
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });


// /**
//  * POST /api/orders/refund
//  * Body: { captureId, amount?, currency?, idempotencyKey? }
//  */
// router.post("/refund", async (req, res) => {
//   try {
//     const { captureId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
//     if (!captureId) return res.status(400).json({ error: "captureId is required" });

//     const refund = await refundCapture(captureId, { amount, currency, idempotencyKey });

//     await saveTx({
//       type: "REFUND", status: refund?.status, amount: refund?.amount?.value, currency: refund?.amount?.currency_code,
//       captureId, refundId: refund?.id, customerId, raw: refund
//     });

//     res.status(201).json({ refundId: refund?.id, status: refund?.status, raw: refund });
//   } catch (err) {
//     res.status(400).json({ error: err.message || String(err) });
//   }
// });


// export default router;

// src/routes/ordersRoutes.js
import express from "express";
import {
  createOrderWithToken,
  captureOrder,
  authorizeOrder,
  captureAuthorization,
  voidAuthorization,
  refundCapture
} from "../lib/paypal-orders.js";
import { saveTx } from "../lib/tx.js";
import { getOrder } from "../lib/paypal-orders.js"; // you added this earlier

const router = express.Router();

/**
 * POST /api/orders/charge
 * Body: { vaultId, amount, currency?, idempotencyKey? }
 * Flow: Create order (intent=CAPTURE) -> capture -> return captureId
 */
router.post("/charge", async (req, res) => {
  try {
    const { vaultId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
    if (!vaultId || !amount) return res.status(400).json({ error: "vaultId and amount are required" });

    const orderKey = idempotencyKey ? `${idempotencyKey}_order` : undefined;
    const capKey   = idempotencyKey ? `${idempotencyKey}_capture` : undefined;

    const order = await createOrderWithToken({ vaultId, intent: "CAPTURE", amount, currency, idempotencyKey: orderKey });

    const pickCapture = (obj) => obj?.purchase_units?.[0]?.payments?.captures?.[0] || null;
    let capture = pickCapture(order);
    let capturedRes = null;

    if (!capture) {
      try {
        capturedRes = await captureOrder(order.id, capKey);
        capture = pickCapture(capturedRes);
      } catch (e) {
        if (String(e?.message || e).includes("ORDER_ALREADY_CAPTURED")) {
          const fetched = await getOrder(order.id);
          capture = pickCapture(fetched);
        } else {
          throw e;
        }
      }
    }

    if (!capture) return res.status(400).json({ error: "No capture returned from PayPal" });

    // persist
    await saveTx({
      type: "ORDER", intent: "CAPTURE", status: order.status, amount, currency, orderId: order.id, vaultId, customerId, raw: order
    });
    await saveTx({
      type: "CAPTURE", status: capture.status, amount: capture?.amount?.value, currency: capture?.amount?.currency_code,
      orderId: order.id, captureId: capture.id, vaultId, customerId, raw: { order, capturedRes }
    });

    res.status(201).json({
      orderId: order.id,
      status: capture.status || "COMPLETED",
      captureId: capture.id,
      amount: capture?.amount,
      raw: { order, capturedRes }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});



/**
 * POST /api/orders/authorize
 * Body: { vaultId, amount, currency?, idempotencyKey? }
 * Returns authorizationId
 */
router.post("/authorize", async (req, res) => {
  try {
    const { vaultId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
    if (!vaultId || !amount) return res.status(400).json({ error: "vaultId and amount are required" });

    const orderKey = idempotencyKey ? `${idempotencyKey}_order` : undefined;
    const authKey  = idempotencyKey ? `${idempotencyKey}_auth`  : undefined;

    const order = await createOrderWithToken({ vaultId, intent: "AUTHORIZE", amount, currency, idempotencyKey: orderKey });

    const pickAuth = (obj) => obj?.purchase_units?.[0]?.payments?.authorizations?.[0] || null;

    let authorization = pickAuth(order);
    let authRes = null;
    if (!authorization) {
      try {
        authRes = await authorizeOrder(order.id, authKey);
        authorization = pickAuth(authRes);
      } catch (e) {
        if (String(e?.message || e).includes("ORDER_ALREADY_AUTHORIZED")) {
          const fetched = await getOrder(order.id);
          authorization = pickAuth(fetched);
        } else {
          throw e;
        }
      }
    }

    if (!authorization) return res.status(400).json({ error: "No authorization returned from PayPal" });

    // persist
    await saveTx({
      type: "ORDER", intent: "AUTHORIZE", status: order.status, amount, currency, orderId: order.id, vaultId, customerId, raw: order
    });
    await saveTx({
      type: "AUTHORIZATION", status: authorization.status, amount, currency,
      orderId: order.id, authorizationId: authorization.id, vaultId, customerId, raw: { order, authRes }
    });

    res.status(201).json({
      orderId: order.id,
      authorizationId: authorization.id,
      status: authorization.status,
      raw: { order, authRes }
    });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});


/**
 * POST /api/orders/capture-authorization
 * Body: { authorizationId, amount?, currency?, idempotencyKey? }
 */
router.post("/capture-authorization", async (req, res) => {
  try {
    const { authorizationId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
    if (!authorizationId) return res.status(400).json({ error: "authorizationId is required" });

    const cap = await captureAuthorization(authorizationId, { amount, currency, idempotencyKey });

    await saveTx({
      type: "CAPTURE", status: cap?.status, amount: cap?.amount?.value, currency: cap?.amount?.currency_code,
      captureId: cap?.id, authorizationId, customerId, raw: cap
    });

    res.status(201).json({ captureId: cap?.id, status: cap?.status, raw: cap });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});


/**
 * POST /api/orders/void-authorization
 * Body: { authorizationId, idempotencyKey? }
 */
router.post("/void-authorization", async (req, res) => {
  try {
    const { authorizationId, idempotencyKey, customerId } = req.body || {};
    if (!authorizationId) return res.status(400).json({ error: "authorizationId is required" });

    const out = await voidAuthorization(authorizationId, idempotencyKey);

    await saveTx({
      type: "VOID", status: out.status, authorizationId, customerId, raw: out
    });

    res.status(200).json(out);
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});


/**
 * POST /api/orders/refund
 * Body: { captureId, amount?, currency?, idempotencyKey? }
 */
router.post("/refund", async (req, res) => {
  try {
    const { captureId, amount, currency = "USD", idempotencyKey, customerId } = req.body || {};
    if (!captureId) return res.status(400).json({ error: "captureId is required" });

    const refund = await refundCapture(captureId, { amount, currency, idempotencyKey });

    await saveTx({
      type: "REFUND", status: refund?.status, amount: refund?.amount?.value, currency: refund?.amount?.currency_code,
      captureId, refundId: refund?.id, customerId, raw: refund
    });

    res.status(201).json({ refundId: refund?.id, status: refund?.status, raw: refund });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
});


export default router;