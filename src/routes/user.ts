// ============================================================
// Routes — Utilisateurs & Admin
// ============================================================

import { Router } from "express";
import {
  updateProfile,
  changePassword,
  addAddress,
  removeAddress,
  getAllUsers,
  toggleUserStatus,
} from "../handlers/user.js";
import { getDashboard, getRevenueStats, getCategoryStats } from "../handlers/admin.js";
import { deleteReview } from "../handlers/review.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
} from "../validation/schemas.js";

// ── User routes ────────────────────────────────────────────
export const userRouter = Router();

userRouter.use(authenticate);

userRouter.put("/profile", validateBody(updateProfileSchema), updateProfile);
userRouter.put("/password", validateBody(changePasswordSchema), changePassword);
userRouter.post("/addresses", validateBody(addressSchema), addAddress);
userRouter.delete("/addresses/:addressId", removeAddress);

// ── Admin routes ───────────────────────────────────────────
export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

// Dashboard
adminRouter.get("/dashboard", getDashboard);
adminRouter.get("/stats/revenue", getRevenueStats);
adminRouter.get("/stats/categories", getCategoryStats);

// Gestion utilisateurs
adminRouter.get("/users", getAllUsers);
adminRouter.put("/users/:id/status", toggleUserStatus);

// Gestion avis
adminRouter.delete("/reviews/:id", deleteReview);