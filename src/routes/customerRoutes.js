import express from "express";
import { Customer } from "../models/Customer.js";

const router = express.Router();

// create customer
router.post("/", async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// list all customers
router.get("/", async (req, res) => {
  const all = await Customer.find().sort({ createdAt: -1 });
  res.json(all);
});

export default router;
