// ============================================================
// Routes — Panier
// ============================================================

import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../handlers/cart.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { addToCartSchema, updateCartItemSchema } from "../validation/schemas.js";

const cartRouter = Router();

cartRouter.use(authenticate); // Toutes les routes panier nécessitent l'auth

cartRouter.get("/", getCart);
cartRouter.post("/items", validateBody(addToCartSchema), addToCart);
cartRouter.put("/items/:productId", validateBody(updateCartItemSchema), updateCartItem);
cartRouter.delete("/items/:productId", removeFromCart);
cartRouter.delete("/", clearCart);

export { cartRouter };