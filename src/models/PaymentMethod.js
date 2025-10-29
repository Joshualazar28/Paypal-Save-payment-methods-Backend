import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
       type: { type: String, enum: ["card", "paypal", "unknown"], required: true },
    vaultId: { type: String, unique: true }, // PayPal vault token (later)
    brand: String,
    last4: String,
    status: { type: String, enum: ["active", "revoked"], default: "active" },
  },
  { timestamps: true }
);

export const PaymentMethod = mongoose.model(
  "PaymentMethod",
  paymentMethodSchema
);
