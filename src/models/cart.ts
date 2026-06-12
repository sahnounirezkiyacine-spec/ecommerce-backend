// ============================================================
// Modèle Panier
// ============================================================

import mongoose, { Document, Schema, Types } from "mongoose";
import type { CartItem } from "../types/index.js";

export interface ICart extends Document {
  user: Types.ObjectId;
  items: CartItem[];
  updatedAt: Date;
  // Virtuel
  total: number;
}

const cartItemSchema = new Schema<CartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "La quantité doit être au moins 1"],
    },
    priceAtTime: {
      type: Number,
      required: true,
      min: [0, "Le prix doit être positif"],
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Virtuel : total du panier ──────────────────────────────
cartSchema.virtual("total").get(function () {
  return this.items.reduce(
    (sum: number, item: CartItem) => sum + item.priceAtTime * item.quantity,
    0
  );
});

cartSchema.index({ user: 1 });

export const Cart = mongoose.model<ICart>("Cart", cartSchema);