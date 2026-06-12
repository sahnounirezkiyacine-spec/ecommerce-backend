

import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} from "../handlers/order.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createOrderSchema, updateOrderStatusSchema } from "../validation/schemas.js";

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.post("/", validateBody(createOrderSchema), createOrder);
orderRouter.get("/", getMyOrders);
orderRouter.get("/:id", getOrderById);

export { orderRouter };

// ── Routes admin commandes ─────────────────────────────────
export const adminOrderRouter = Router();

adminOrderRouter.use(authenticate, requireAdmin);

adminOrderRouter.get("/", getAllOrders);
adminOrderRouter.get("/:id", getOrderById);
adminOrderRouter.put("/:id/status", validateBody(updateOrderStatusSchema), updateOrderStatus);