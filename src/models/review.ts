// ============================================================
// Modèle Avis / Note produit
// ============================================================

import mongoose, { Document, Schema, Types } from "mongoose";
import { Product } from "./product.js";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "La note est obligatoire"],
      min: [1, "La note minimale est 1"],
      max: [5, "La note maximale est 5"],
    },
    title: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
      maxlength: [100, "Le titre ne peut pas dépasser 100 caractères"],
    },
    comment: {
      type: String,
      required: [true, "Le commentaire est obligatoire"],
      trim: true,
      maxlength: [1000, "Le commentaire ne peut pas dépasser 1000 caractères"],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Un seul avis par utilisateur par produit ───────────────
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// ── Méthode statique : recalculer la note moyenne ──────────
reviewSchema.statics["recalculateRatings"] = async function (productId: Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": Math.round(stats[0].averageRating * 10) / 10,
      "ratings.count": stats[0].count,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      "ratings.average": 0,
      "ratings.count": 0,
    });
  }
};

// ── Hook : recalcul après save / remove ───────────────────
reviewSchema.post("save", async function () {
  // @ts-expect-error: méthode statique custom
  await this.constructor.recalculateRatings(this.product);
});

reviewSchema.post("findOneAndDelete", async function (doc: IReview | null) {
  if (doc) {
    // @ts-expect-error: méthode statique custom
    await doc.constructor.recalculateRatings(doc.product);
  }
});

export const Review = mongoose.model<IReview>("Review", reviewSchema);