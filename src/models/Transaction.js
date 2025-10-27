import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["ORDER", "CAPTURE", "AUTHORIZATION", "VOID", "REFUND"], required: true },
    intent: { type: String, enum: ["CAPTURE", "AUTHORIZE"], default: null }, // for orders
    status: { type: String },
    amount: { type: String },
    currency: { type: String, default: "USD" },

    // PayPal IDs
    orderId: { type: String },
    captureId: { type: String },
    authorizationId: { type: String },
    refundId: { type: String },

    // Linking
    vaultId: { type: String },        // TOKEN-...
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },

    // Raw payloads (for debugging)
    raw: { type: Object }
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", TransactionSchema);
