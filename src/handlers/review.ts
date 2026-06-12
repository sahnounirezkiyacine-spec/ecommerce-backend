// ============================================================
// Handlers Avis produits
// ============================================================

import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Review } from "../models/review.js";
import { Product } from "../models/product.js";
import { Order } from "../models/order.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import type { AuthRequest } from "../types/index.js";

// ── POST /products/:slug/reviews ───────────────────────────
export async function createReview(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const product = await Product.findOne({ slug: req.params["slug"], isActive: true });
  if (!product) {
    sendError(res, "Produit introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  // Vérifier si l'utilisateur a déjà laissé un avis
  const existing = await Review.findOne({ product: product._id, user: req.user.userId });
  if (existing) {
    sendError(res, "Vous avez déjà laissé un avis pour ce produit", StatusCodes.CONFLICT);
    return;
  }

  // Vérifier si l'utilisateur a acheté ce produit (achat vérifié)
  const hasPurchased = await Order.findOne({
    user: req.user.userId,
    "items.product": product._id,
    status: "delivered",
  });

  const { rating, title, comment } = req.body as {
    rating: number;
    title: string;
    comment: string;
  };

  const review = await Review.create({
    product: product._id,
    user: req.user.userId,
    rating,
    title,
    comment,
    isVerifiedPurchase: !!hasPurchased,
  });

  await review.populate("user", "firstName lastName");

  sendSuccess(res, review, "Avis publié", StatusCodes.CREATED);
}

// ── GET /products/:slug/reviews ────────────────────────────
export async function getProductReviews(req: Request, res: Response): Promise<void> {
  const product = await Product.findOne({ slug: req.params["slug"] });
  if (!product) {
    sendError(res, "Produit introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  const reviews = await Review.find({ product: product._id })
    .populate("user", "firstName lastName")
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, reviews, "Avis récupérés");
}

// ── DELETE /reviews/:id (propriétaire ou admin) ────────────
export async function deleteReview(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const query =
    req.user.role === "admin"
      ? { _id: req.params["id"] }
      : { _id: req.params["id"], user: req.user.userId };

  const review = await Review.findOneAndDelete(query);
  if (!review) {
    sendError(res, "Avis introuvable ou non autorisé", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, null, "Avis supprimé");
}