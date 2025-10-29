// src/lib/paypal-auth.js
import fetch from "node-fetch";

const BASE = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

export async function getAccessToken() {
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
export const PAYPAL_BASE = BASE;
