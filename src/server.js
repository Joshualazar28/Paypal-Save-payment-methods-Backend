import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import customerRoutes from "./routes/customerRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import paypalRoutes from "./routes/paypalRoutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import transactionsRoutes from "./routes/transactionsRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// health
app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

// routes
app.use("/api/customers", customerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/paypal", paypalRoutes);   
app.use("/api/orders", ordersRoutes);
app.use("/api/paypal/webhook", webhookRoutes);
app.use("/api/transactions", transactionsRoutes);



const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`[HTTP] http://localhost:${PORT}`));
}
start();
