// ============================================================
// Modèle Produit (électronique)
// ============================================================

import mongoose, { Document, Schema, Types } from "mongoose";
import type { ProductCategory } from "../types/index.js";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;         // Prix barré (ancien prix)
  category: ProductCategory;
  brand: string;
  sku: string;                     // Stock Keeping Unit
  stock: number;
  images: string[];
  thumbnail: string;
  specifications: Map<string, string>; // Ex: { "RAM": "16GB", "Storage": "512GB" }
  tags: string[];
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  isFeatured: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Le nom du produit est obligatoire"],
      trim: true,
      maxlength: [200, "Le nom ne peut pas dépasser 200 caractères"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "La description est obligatoire"],
    },
    shortDescription: {
      type: String,
      required: [true, "La description courte est obligatoire"],
      maxlength: [300, "La description courte ne peut pas dépasser 300 caractères"],
    },
    price: {
      type: Number,
      required: [true, "Le prix est obligatoire"],
      min: [0, "Le prix doit être positif"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Le prix comparé doit être positif"],
    },
    category: {
      type: String,
      required: [true, "La catégorie est obligatoire"],
      enum: [
        "smartphones",
        "laptops",
        "tablets",
        "accessories",
        "audio",
        "gaming",
        "cameras",
        "tv",
        "components",
        "other",
      ],
    },
    brand: {
      type: String,
      required: [true, "La marque est obligatoire"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "Le SKU est obligatoire"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Le stock ne peut pas être négatif"],
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      required: [true, "La miniature est obligatoire"],
    },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Index pour les recherches ──────────────────────────────
productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// ── Virtuel : en stock ? ───────────────────────────────────
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// ── Hook : génération automatique du slug ──────────────────
productSchema.pre("save", function () {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }
});

export const Product = mongoose.model<IProduct>("Product", productSchema);