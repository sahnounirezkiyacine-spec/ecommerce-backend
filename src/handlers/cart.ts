// ============================================================
// Handlers Panier
// ============================================================

import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Cart } from "../models/cart.js";
import { Product } from "../models/product.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import type { CartItem, AuthRequest } from "../types/index.js";

// ── GET /cart ──────────────────────────────────────────────
export async function getCart(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const cart = await Cart.findOne({ user: req.user.userId })
    .populate("items.product", "name thumbnail price stock isActive slug");

  if (!cart) {
    sendSuccess(res, { items: [], total: 0 }, "Panier vide");
    return;
  }

  // Calculer le total côté serveur
  const total = cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.priceAtTime * item.quantity,
    0
  );

  sendSuccess(res, { ...cart.toObject(), total }, "Panier récupéré");
}

// ── POST /cart/items ───────────────────────────────────────
export async function addToCart(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { productId, quantity } = req.body as { productId: string; quantity: number };

  // Vérifier que le produit existe et est disponible
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) {
    sendError(res, "Produit introuvable ou indisponible", StatusCodes.NOT_FOUND);
    return;
  }

  if (product.stock < quantity) {
    sendError(
      res,
      `Stock insuffisant. Disponible : ${product.stock}`,
      StatusCodes.CONFLICT
    );
    return;
  }

  let cart = await Cart.findOne({ user: req.user.userId });

  if (!cart) {
    cart = await Cart.create({
      user: req.user.userId,
      items: [{ product: productId, quantity, priceAtTime: product.price }],
    });
  } else {
    const existingIdx = cart.items.findIndex(
      (item: CartItem) => String(item.product) === productId
    );

    if (existingIdx >= 0) {
      const newQty = cart.items[existingIdx].quantity + quantity;
      if (newQty > product.stock) {
        sendError(
          res,
          `Quantité totale dépasse le stock. Disponible : ${product.stock}`,
          StatusCodes.CONFLICT
        );
        return;
      }
      cart.items[existingIdx].quantity = newQty;
      // Mettre à jour le prix si il a changé
      cart.items[existingIdx].priceAtTime = product.price;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
        priceAtTime: product.price,
      });
    }

    await cart.save();
  }

  await cart.populate("items.product", "name thumbnail price stock slug");
  sendSuccess(res, cart, "Produit ajouté au panier", StatusCodes.CREATED);
}

// ── PUT /cart/items/:productId ─────────────────────────────
export async function updateCartItem(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { quantity } = req.body as { quantity: number };
  const { productId } = req.params as { productId: string };

  const cart = await Cart.findOne({ user: req.user.userId });
  if (!cart) {
    sendError(res, "Panier introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  const itemIdx = cart.items.findIndex(
    (item: CartItem) => String(item.product) === productId
  );

  if (itemIdx === -1) {
    sendError(res, "Article introuvable dans le panier", StatusCodes.NOT_FOUND);
    return;
  }

  const product = await Product.findById(productId);
  if (!product || product.stock < quantity) {
    sendError(res, `Stock insuffisant. Disponible : ${product?.stock ?? 0}`, StatusCodes.CONFLICT);
    return;
  }

  cart.items[itemIdx].quantity = quantity;
  await cart.save();

  sendSuccess(res, cart, "Quantité mise à jour");
}

// ── DELETE /cart/items/:productId ──────────────────────────
export async function removeFromCart(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { productId } = req.params as { productId: string };

  const cart = await Cart.findOneAndUpdate(
    { user: req.user.userId },
    { $pull: { items: { product: productId } } },
    { new: true }
  );

  if (!cart) {
    sendError(res, "Panier introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, cart, "Article retiré du panier");
}

// ── DELETE /cart ───────────────────────────────────────────
export async function clearCart(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  await Cart.findOneAndUpdate(
    { user: req.user.userId },
    { $set: { items: [] } }
  );

  sendSuccess(res, null, "Panier vidé");
}