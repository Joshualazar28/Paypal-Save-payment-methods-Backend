import { Transaction } from "../models/Transaction.js";

export async function saveTx(data) {
  try {
    const doc = await Transaction.create(data);
    return doc.toObject();
  } catch (e) {
    console.error("[saveTx] error", e);
    return null;
  }
}
