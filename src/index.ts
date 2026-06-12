
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDatabase } from "./config/database.js";
import { authRouter } from "./routes/auth.js";
import { productRouter } from "./routes/product.js";
import { cartRouter } from "./routes/cart.js";
import { orderRouter, adminOrderRouter } from "./routes/order.js";
import { userRouter, adminRouter } from "./routes/user.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

// ── Middlewares globaux ────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env["FRONTEND_DOMAIN"] ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes API ─────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/users", userRouter);

// ── Routes Admin ───────────────────────────────────────────
app.use("/api/admin", adminRouter);
app.use("/api/admin/orders", adminOrderRouter);

// ── Health check ───────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "API e-commerce opérationnelle",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Gestionnaires d'erreurs ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Démarrage ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📦 Environnement : ${process.env["NODE_ENV"] ?? "development"}`);
    console.log(`📋 Documentation des routes :`);
    console.log(`   Auth      → /api/auth`);
    console.log(`   Produits  → /api/products`);
    console.log(`   Panier    → /api/cart`);
    console.log(`   Commandes → /api/orders`);
    console.log(`   Profil    → /api/users`);
    console.log(`   Admin     → /api/admin`);
    console.log(`   Santé     → /api/health`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Échec du démarrage :", err);
  process.exit(1);
});