// ============================================================
// Handlers Dashboard Admin
// ============================================================

import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import type { AuthRequest } from "../types/index.js";

// ── GET /admin/dashboard ───────────────────────────────────
export async function getDashboard(_req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    lowStockProducts,
    totalOrders,
    ordersThisMonth,
    revenueStats,
    ordersByStatus,
    topProducts,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: startOfMonth } }),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: { $lte: 5 } }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),

    // Revenus ce mois vs mois dernier
    Order.aggregate([
      {
        $facet: {
          thisMonth: [
            {
              $match: {
                createdAt: { $gte: startOfMonth },
                paymentStatus: "paid",
              },
            },
            { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
          ],
          lastMonth: [
            {
              $match: {
                createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
                paymentStatus: "paid",
              },
            },
            { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
          ],
        },
      },
    ]),

    // Commandes par statut
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Top 5 produits les plus commandés
    Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.priceAtTime", "$items.quantity"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          totalSold: 1,
          revenue: 1,
          "product.name": 1,
          "product.thumbnail": 1,
          "product.slug": 1,
          "product.category": 1,
        },
      },
    ]),
  ]);

  const thisMonthRevenue = revenueStats[0]?.thisMonth[0]?.total ?? 0;
  const lastMonthRevenue = revenueStats[0]?.lastMonth[0]?.total ?? 0;
  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

  sendSuccess(
    res,
    {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      products: { total: totalProducts, lowStock: lowStockProducts },
      orders: {
        total: totalOrders,
        thisMonth: ordersThisMonth,
        byStatus: ordersByStatus,
      },
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
      },
      topProducts,
    },
    "Dashboard récupéré"
  );
}

// ── GET /admin/stats/revenue — Revenus par mois ────────────
export async function getRevenueStats(_req: AuthRequest, res: Response): Promise<void> {
  const stats = await Order.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 },
  ]);

  sendSuccess(res, stats, "Statistiques de revenus");
}

// ── GET /admin/stats/categories ────────────────────────────
export async function getCategoryStats(_req: AuthRequest, res: Response): Promise<void> {
  const stats = await Order.aggregate([
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        revenue: { $sum: { $multiply: ["$items.priceAtTime", "$items.quantity"] } },
        unitsSold: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  sendSuccess(res, stats, "Statistiques par catégorie");
}