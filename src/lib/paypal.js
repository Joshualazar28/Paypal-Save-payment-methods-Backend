// // src/lib/paypal.js
// import dotenv from "dotenv";
// dotenv.config();

// // Base PayPal API URL
// const BASE = process.env.PAYPAL_BASE_URL;

// /**
//  * Get Access Token from PayPal
//  */
// export async function getAccessToken() {
//   const credentials = `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`;
//   const auth = Buffer.from(credentials).toString("base64");

//   const res = await fetch(`${BASE}/v1/oauth2/token`, {
//     method: "POST",
//     headers: {
//       "Authorization": `Basic ${auth}`,
//       "Content-Type": "application/x-www-form-urlencoded",
//     },
//     body: "grant_type=client_credentials",
//   });

//   if (!res.ok) {
//     const txt = await res.text();
//     console.error("PayPal OAuth Error:", txt);
//     throw new Error(`PayPal OAuth failed: ${res.status}`);
//   }

//   const data = await res.json();
//   return data.access_token;
// }

// /**
//  * Create Setup Token (to prepare for vaulting a card)
//  */
// export async function createSetupToken({ brandName = "Limo Service", locale = "en-US" } = {}) {
//   const accessToken = await getAccessToken();

//   const body = {
//     payment_source: { card: {} },
//     experience_context: {
//       brand_name: brandName,
//       locale,
//     },
//   };

//   const res = await fetch(`${BASE}/v3/vault/setup-tokens`, {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${accessToken}`,
//       "Content-Type": "application/json",
//       "PayPal-Request-Id": `setup_${Date.now()}`, // idempotency key
//     },
//     body: JSON.stringify(body),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     console.error("Setup Token Error:", data);
//     throw new Error(`Setup token error ${res.status}`);
//   }

//   return data; // contains id, status, etc.
// }

// /**
//  * Generate Client Token (for PayPal JS SDK / Hosted Fields)
//  */
// export async function generateClientToken() {
//   const accessToken = await getAccessToken();

//   const res = await fetch(`${BASE}/v1/identity/generate-token`, {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${accessToken}`,
//       "Accept": "application/json",
//       "Content-Type": "application/json",
//     },
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     console.error("Client Token Error:", data);
//     throw new Error(`Client token error ${res.status}`);
//   }

//   return data; // { client_token: "..." }
// }


// /**
//  * Exchange an approved vaultSetupToken for a Payment Token (vault_id)
//  * Docs: POST /v3/vault/payment-tokens
//  */
// export async function createPaymentTokenFromSetup({ vaultSetupToken, merchantCustomerId = undefined } = {}) {
//   if (!vaultSetupToken) throw new Error("vaultSetupToken is required");

//   const accessToken = await getAccessToken();

//   const body = {
//     payment_source: {
//       token: {
//         id: vaultSetupToken,
//         type: "SETUP_TOKEN"
//       }
//     }
//   };

//   // Optional: attach your own customer reference used in your system
//   if (merchantCustomerId) {
//     body.customer = { id: merchantCustomerId }; // merchant-side mapping (optional)
//   }

//   const res = await fetch(`${BASE}/v3/vault/payment-tokens`, {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${accessToken}`,
//       "Content-Type": "application/json",
//       "PayPal-Request-Id": `pmtok_${Date.now()}`
//     },
//     body: JSON.stringify(body)
//   });

//   const data = await res.json();
//   if (!res.ok) {
//     console.error("Payment Token Error:", data);
//     throw new Error(`Payment token error ${res.status}`);
//   }

//   // Typically returns: { id: "PAYMENT-TOKEN-XXX", customer: { id: ... }, payment_source: {...}, ... }
//   return data;
// }



// export async function createPaymentToken({ vaultSetupToken }) {
//   const accessToken = await getAccessToken();
//   const r = await fetch(`${BASE}/v3/vault/payment-tokens`, {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//       "Content-Type": "application/json",
//       "PayPal-Request-Id": `pt_${Date.now()}`
//     },
//     body: JSON.stringify({
//       payment_source: {
//         token: {
//           id: vaultSetupToken,     // <-- setup token from onApprove
//           type: "SETUP_TOKEN"      // <-- REQUIRED
//         }
//       }
//     })
//   });
//   const j = await r.json();
//   if (!r.ok) throw new Error(`payment-token ${r.status}: ${JSON.stringify(j)}`);
//   return j; // { id: <vault_id>, payment_source: { paypal: {...} }, ... }
// }

// src/lib/paypal.js
import dotenv from "dotenv";
dotenv.config();

// Base PayPal API URL
const BASE = process.env.PAYPAL_BASE_URL;

/**
 * Get Access Token from PayPal
 */
export async function getAccessToken() {
  const credentials = `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`;
  const auth = Buffer.from(credentials).toString("base64");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("PayPal OAuth Error:", txt);
    throw new Error(`PayPal OAuth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Create Setup Token (to prepare for vaulting a card)
 */
export async function createSetupToken({ brandName = "Limo Service", locale = "en-US" } = {}) {
  const accessToken = await getAccessToken();

  const body = {
    payment_source: { card: {} },
    experience_context: {
      brand_name: brandName,
      locale,
    },
  };

  const res = await fetch(`${BASE}/v3/vault/setup-tokens`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `setup_${Date.now()}`, // idempotency key
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Setup Token Error:", data);
    throw new Error(`Setup token error ${res.status}`);
  }

  return data; // contains id, status, etc.
}

/**
 * Generate Client Token (for PayPal JS SDK / Hosted Fields)
 */
export async function generateClientToken() {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE}/v1/identity/generate-token`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Client Token Error:", data);
    throw new Error(`Client token error ${res.status}`);
  }

  return data; // { client_token: "..." }
}


/**
 * Exchange an approved vaultSetupToken for a Payment Token (vault_id)
 * Docs: POST /v3/vault/payment-tokens
 */
export async function createPaymentTokenFromSetup({ vaultSetupToken, merchantCustomerId = undefined } = {}) {
  if (!vaultSetupToken) throw new Error("vaultSetupToken is required");

  const accessToken = await getAccessToken();

  const body = {
    payment_source: {
      token: {
        id: vaultSetupToken,
        type: "SETUP_TOKEN"
      }
    }
  };

  // Optional: attach your own customer reference used in your system
  if (merchantCustomerId) {
    body.customer = { id: merchantCustomerId }; // merchant-side mapping (optional)
  }

  const res = await fetch(`${BASE}/v3/vault/payment-tokens`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `pmtok_${Date.now()}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Payment Token Error:", data);
    throw new Error(`Payment token error ${res.status}`);
  }

  // Typically returns: { id: "PAYMENT-TOKEN-XXX", customer: { id: ... }, payment_source: {...}, ... }
  return data;
}

export async function createPaymentToken({ vaultSetupToken, setupTokenId }) {
  const accessToken = await getAccessToken();

  if (!vaultSetupToken && !setupTokenId) {
    throw new Error("Either vaultSetupToken or setupTokenId is required");
  }

  // Build candidate payloads (order matters)
  const candidates = [];

  if (vaultSetupToken) {
    candidates.push(
      // A) Preferred Card Fields path
      { body: { vault_setup_token: vaultSetupToken }, label: "vault_setup_token" },
      // D) Alt token-in-payment_source path
      { body: { payment_source: { token: { id: vaultSetupToken, type: "VAULT_SETUP_TOKEN" } } }, label: "payment_source.token(VAULT_SETUP_TOKEN)" }
    );
  }

  if (setupTokenId) {
    candidates.push(
      // B) Hosted Fields doc path
      { body: { setup_token_id: setupTokenId }, label: "setup_token_id" },
      // C) Alt token-in-payment_source path (some tenants require)
      { body: { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } }, label: "payment_source.token(SETUP_TOKEN)" }
    );
  }

  let lastErr = null;
  for (const cand of candidates) {
    try {
      const res = await fetch(`${BASE}/v3/vault/payment-tokens`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `pmtok_${Date.now()}_${cand.label}`
        },
        body: JSON.stringify(cand.body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Save err and try next candidate
        lastErr = { status: res.status, data, label: cand.label };
        continue;
      }
      return data; // success 🎉
    } catch (e) {
      lastErr = { status: 0, data: String(e), label: cand.label };
      continue;
    }
  }

  // If we got here, all candidates failed
  const detail = JSON.stringify(lastErr, null, 2);
  throw new Error(`Payment token error: all payloads failed. Last: ${detail}`);
}