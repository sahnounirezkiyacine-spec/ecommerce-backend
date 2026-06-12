

import { Router } from "express";
import {
  getProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getCategories,
} from "../handlers/product.js";
import {
  createReview,
  getProductReviews,
} from "../handlers/review.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createReviewSchema,
} from "../validation/schemas.js";

const productRouter = Router();

// Publiques
productRouter.get("/", getProducts);
productRouter.get("/featured", getFeaturedProducts);
productRouter.get("/categories", getCategories);
productRouter.get("/:slug", getProductBySlug);
productRouter.get("/:slug/reviews", getProductReviews);

// Authentifiées
productRouter.post("/:slug/reviews", authenticate, validateBody(createReviewSchema), createReview);

// Admin uniquement
productRouter.post("/", authenticate, requireAdmin, validateBody(createProductSchema), createProduct);
productRouter.put("/:id", authenticate, requireAdmin, validateBody(updateProductSchema), updateProduct);
productRouter.delete("/:id", authenticate, requireAdmin, deleteProduct);

export { productRouter };