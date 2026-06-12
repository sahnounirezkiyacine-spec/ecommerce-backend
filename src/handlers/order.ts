
import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { Order } from "../models/order.js";
import { Cart } from "../models/cart.js";
import { Product } from "../models/product.js";
import {
  sendSuccess,
  sendError,
  parsePagination,
  buildPaginatedResult,
  calculateShipping,
  calculateTax,
} from "../utils/helpers.js";
import type { CartItem, OrderStatus, ShippingAddress, PaymentMethod, AuthRequest } from "../types/index.js";

// ── POST /orders — Créer une commande depuis le panier ─────
export async function createOrder(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { shippingAddress, paymentMethod, notes } = req.body as {
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    notes?: string;
  };

  // ── Transaction MongoDB ────────────────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Récupérer le panier
    const cart = await Cart.findOne({ user: req.user.userId }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      sendError(res, "Votre panier est vide", StatusCodes.BAD_REQUEST);
      return;
    }

    // 2. Vérifier le stock de chaque produit et décrémenter
    const orderItems: CartItem[] = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product).session(session);

      if (!product || !product.isActive) {
        await session.abortTransaction();
        sendError(res, `Produit indisponible : ${item.product}`, StatusCodes.CONFLICT);
        return;
      }

      if (product.stock < item.quantity) {
        await session.abortTransaction();
        sendError(
          res,
          `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}`,
          StatusCodes.CONFLICT
        );
        return;
      }

      // Décrémenter le stock
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } },
        { session }
      );

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
      });
    }

    // 3. Calculer les montants
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.priceAtTime * item.quantity,
      0
    );
    const shippingCost = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shippingCost + tax;

    // 4. Créer la commande
    const [order] = await Order.create(
      [
        {
          user: req.user.userId,
          items: orderItems,
          shippingAddress,
          subtotal,
          shippingCost,
          tax,
          total,
          paymentMethod,
          notes,
        },
      ],
      { session }
    );

    // 5. Vider le panier
    await Cart.findOneAndUpdate(
      { user: req.user.userId },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction();

    sendSuccess(res, order, "Commande créée avec succès", StatusCodes.CREATED);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// ── GET /orders — Mes commandes ────────────────────────────
export async function getMyOrders(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { page, limit, sort, order } = parsePagination(req.query as Record<string, unknown>);
  const skip = (page - 1) * limit;

  const filter = { user: req.user.userId };
  const sortObj: Record<string, 1 | -1> = { [sort]: order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("items.product", "name thumbnail slug")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, buildPaginatedResult(items, total, page, limit), "Commandes récupérées");
}

// ── GET /orders/:id ────────────────────────────────────────
export async function getOrderById(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const query =
    req.user.role === "admin"
      ? { _id: req.params["id"] }
      : { _id: req.params["id"], user: req.user.userId };

  const order = await Order.findOne(query)
    .populate("user", "firstName lastName email phone")
    .populate("items.product", "name thumbnail slug brand");

  if (!order) {
    sendError(res, "Commande introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, order, "Commande récupérée");
}

// ── PUT /orders/:id/status (admin) ─────────────────────────
export async function updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  const { status, note } = req.body as { status: OrderStatus; note?: string };

  const order = await Order.findById(req.params["id"]);
  if (!order) {
    sendError(res, "Commande introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  const oldStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status, changedAt: new Date(), note });

  // Si payé
  if (status === "confirmed") {
    order.paymentStatus = "paid";
  }

  // Si annulé : réincrémenter le stock
  if (status === "cancelled" && oldStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }
    order.paymentStatus = "refunded";
  }

  await order.save();
  sendSuccess(res, order, "Statut de commande mis à jour");
}

// ── GET /admin/orders (admin) ──────────────────────────────
export async function getAllOrders(req: AuthRequest, res: Response): Promise<void> {
  const { page, limit, sort, order } = parsePagination(req.query as Record<string, unknown>);
  const { status } = req.query as { status?: string };
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status) filter["status"] = status;

  const sortObj: Record<string, 1 | -1> = { [sort]: order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "firstName lastName email")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  sendSuccess(res, buildPaginatedResult(items, total, page, limit), "Toutes les commandes");
}