import express from "express";
import { Transaction } from "../models/Transaction.js";
const router = express.Router();

// ?q=CAPTURE|AUTHORIZATION|REFUND|VOID and ?limit=50
router.get("/", async (req, res) => {
  const { q, limit = 50 } = req.query || {};
  const filter = q ? { type: q.toUpperCase() } : {};
  const list = await Transaction.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
  res.json(list);
});

export default router;
