import express from "express";
import { PaymentMethod } from "../models/PaymentMethod.js";

const router = express.Router();

// create payment method
router.post("/", async (req, res) => {
  try {
    const pay = await PaymentMethod.create(req.body);
    res.status(201).json(pay);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// list all
router.get("/", async (req, res) => {
  const all = await PaymentMethod.find()
    .populate("customerId", "name email")
    .sort({ createdAt: -1 });
  res.json(all);
});

export default router;
