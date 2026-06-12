// ============================================================
// Types globaux — Boutique électronique e-commerce
// ============================================================

import { Request } from "express";
import { Types } from "mongoose";

// ── Rôles utilisateur ──────────────────────────────────────
export type UserRole = "customer" | "admin";

// ── Payload JWT ────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ── Request authentifiée ───────────────────────────────────
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ── Réponse API standardisée ───────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

// ── Pagination ─────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Catégories produits électroniques ──────────────────────
export type ProductCategory =
  | "smartphones"
  | "laptops"
  | "tablets"
  | "accessories"
  | "audio"
  | "gaming"
  | "cameras"
  | "tv"
  | "components"
  | "other";

// ── Statuts commande ───────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

// ── Méthodes de paiement ───────────────────────────────────
export type PaymentMethod = "credit_card" | "paypal" | "bank_transfer" | "cash_on_delivery";

// ── Statut paiement ────────────────────────────────────────
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

// ── Item de panier ─────────────────────────────────────────
export interface CartItem {
  product: Types.ObjectId;
  quantity: number;
  priceAtTime: number;
}

// ── Adresse de livraison ───────────────────────────────────
export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  wilaya: string;
  postalCode: string;
  phone: string;
}