

import { z } from "zod";

// ── Auth ───────────────────────────────────────────────────
export const registerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Adresse ────────────────────────────────────────────────
export const addressSchema = z.object({
  fullName: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  wilaya: z.string().min(2).max(100),
  postalCode: z.string().min(4).max(10),
  phone: z.string().min(9).max(15),
});

// ── Produit ────────────────────────────────────────────────
const productCategoryEnum = z.enum([
  "smartphones", "laptops", "tablets", "accessories",
  "audio", "gaming", "cameras", "tv", "components", "other",
]);

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10),
  shortDescription: z.string().min(5).max(300),
  price: z.number().positive("Le prix doit être positif"),
  compareAtPrice: z.number().positive().optional(),
  category: productCategoryEnum,
  brand: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).default([]),
  thumbnail: z.string().url("URL de miniature invalide"),
  specifications: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  category: productCategoryEnum.optional(),
  brand: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  search: z.string().optional(),
  featured: z.string().optional(),
  inStock: z.string().optional(),
});

// ── Panier ─────────────────────────────────────────────────
export const addToCartSchema = z.object({
  productId: z.string().min(1, "ID produit requis"),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

// ── Commande ───────────────────────────────────────────────
export const createOrderSchema = z.object({
  shippingAddress: addressSchema,
  paymentMethod: z.enum(["credit_card", "paypal", "bank_transfer", "cash_on_delivery"]),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
  ]),
  note: z.string().max(200).optional(),
});

// ── Avis ───────────────────────────────────────────────────
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100),
  comment: z.string().min(10).max(1000),
});

// ── Profil utilisateur ─────────────────────────────────────
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});