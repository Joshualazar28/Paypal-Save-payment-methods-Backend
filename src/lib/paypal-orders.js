// src/lib/paypal-orders.js
import dotenv from "dotenv";
import { getAccessToken } from "./paypal.js";
dotenv.config();

const BASE = process.env.PAYPAL_BASE_URL;



export async function getOrder(orderId) {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`getOrder error ${res.status}: ${JSON.stringify(data)}`);
  return data; // may contain purchase_units[0].payments.authorizations[0]
}


// Create an order using a VAULTED PAYMENT TOKEN
export async function createOrderWithToken({
  vaultId,
  intent = "CAPTURE",
  amount = "1.00",
  currency = "USD",
  referenceId = "PU-1",
  idempotencyKey = ""
}) {
  const accessToken = await getAccessToken();
  if (!vaultId) throw new Error("vaultId is required");

  const common = {
    intent,
    purchase_units: [
      {
        reference_id: referenceId,
        amount: { currency_code: currency, value: String(amount) }
      }
    ]
  };

  // Try multiple payload shapes (order matters)
  const candidates = [
    // 1) Most common for vaulted cards created via /v3/vault/payment-tokens
    { label: "token.PAYMENT_METHOD_TOKEN", body: { ...common, payment_source: { token: { id: vaultId, type: "PAYMENT_METHOD_TOKEN" } } } },

    // 2) Some tenants accept the older value
    { label: "token.PAYMENT_TOKEN",        body: { ...common, payment_source: { token: { id: vaultId, type: "PAYMENT_TOKEN" } } } },

    // 3) Some accept direct card vault id form
    { label: "card.vault_id",              body: { ...common, payment_source: { card: { vault_id: vaultId } } } }
  ];

  let lastErr = null;

  for (const cand of candidates) {
    try {
      const res = await fetch(`${BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "PayPal-Request-Id": `${idempotencyKey}_${cand.label}` } : {})
        },
        body: JSON.stringify(cand.body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = { label: cand.label, status: res.status, data };
        continue;
      }
      return data; // ✅ success
    } catch (e) {
      lastErr = { label: cand.label, status: 0, data: String(e) };
      continue;
    }
  }

  throw new Error(`createOrder error: all shapes failed. Last=${JSON.stringify(lastErr)}`);
}

// For intent=CAPTURE orders
export async function captureOrder(orderId, idempotencyKey = "") {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`captureOrder error ${res.status}: ${JSON.stringify(data)}`);
  return data; // captures[0].id
}

// For intent=AUTHORIZE orders
export async function authorizeOrder(orderId, idempotencyKey = "") {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/authorize`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`authorizeOrder error ${res.status}: ${JSON.stringify(data)}`);
  return data; // authorizations[0].id
}

export async function captureAuthorization(authorizationId, { amount, currency = "USD", idempotencyKey = "" } = {}) {
  const accessToken = await getAccessToken();
  const body = amount ? { amount: { value: String(amount), currency_code: currency } } : {};
  const res = await fetch(`${BASE}/v2/payments/authorizations/${authorizationId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {})
    },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`captureAuthorization error ${res.status}: ${JSON.stringify(data)}`);
  return data; // id (captureId)
}

export async function voidAuthorization(authorizationId, idempotencyKey = "") {
  const accessToken = await getAccessToken();
  const res = await fetch(`${BASE}/v2/payments/authorizations/${authorizationId}/void`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {})
    }
  });
  if (res.status !== 204 && res.status !== 200) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`voidAuthorization error ${res.status}: ${JSON.stringify(data)}`);
  }
  return { status: "VOIDED" };
}

export async function refundCapture(captureId, { amount, currency = "USD", idempotencyKey = "" } = {}) {
  const accessToken = await getAccessToken();
  const body = amount ? { amount: { value: String(amount), currency_code: currency } } : {};
  const res = await fetch(`${BASE}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "PayPal-Request-Id": idempotencyKey } : {})
    },
    body: Object.keys(body).length ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`refundCapture error ${res.status}: ${JSON.stringify(data)}`);
  return data; // refund id
}
