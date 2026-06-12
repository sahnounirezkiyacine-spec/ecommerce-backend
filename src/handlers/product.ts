
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Product } from "../models/product.js";
import { Review } from "../models/review.js";
import {
  sendSuccess,
  sendError,
  parsePagination,
  buildPaginatedResult,
  slugify,
} from "../utils/helpers.js";
import type { AuthRequest } from "../types/index.js";


export async function getProducts(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10)))
  const sort = String(req.query["sort"] ?? "createdAt")
  const order = req.query["order"] === "asc" ? "asc" : "desc"
  const { category, brand, minPrice, maxPrice, search, featured, inStock } =
    req.query as Record<string, string | undefined>

  const filter: Record<string, unknown> = { isActive: { $ne: false } }

  if (category) filter["category"] = category
  if (brand) filter["brand"] = new RegExp(brand, "i")
  if (featured === "true") filter["isFeatured"] = true
  if (inStock === "true") filter["stock"] = { $gt: 0 }

  if (minPrice || maxPrice) {
    filter["price"] = {
      ...(minPrice ? { $gte: parseFloat(minPrice) } : {}),
      ...(maxPrice ? { $lte: parseFloat(maxPrice) } : {}),
    }
  }

  if (search) {
    filter["$text"] = { $search: search }
  }

  const sortObj: Record<string, 1 | -1> = { [sort]: order === "asc" ? 1 : -1 }
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)

  sendSuccess(res, {
    items,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }, "Produits récupérés")
}


export async function getProductBySlug(req: Request, res: Response): Promise<void> {
  const product = await Product.findOne({
    slug: req.params["slug"],
    isActive: true,
  }).lean();

  if (!product) {
    sendError(res, "Produit introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  // Récupérer les avis
  const reviews = await Review.find({ product: product._id })
    .populate("user", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  sendSuccess(res, { product, reviews }, "Produit récupéré");
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED);
    return;
  }

  const data = req.body as Record<string, unknown>;

 
  const slug = slugify(data["name"] as string);

  const product = await Product.create({
    ...data,
    slug,
    createdBy: req.user.userId,
  });

  sendSuccess(res, product, "Produit créé", StatusCodes.CREATED);
}


export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body as Record<string, unknown>;

 
  if (data["name"]) {
    data["slug"] = slugify(data["name"] as string);
  }

  const product = await Product.findByIdAndUpdate(
    req.params["id"],
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!product) {
    sendError(res, "Produit introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, product, "Produit mis à jour");
}


export async function deleteProduct(req: Request, res: Response): Promise<void> {

  const product = await Product.findByIdAndUpdate(
    req.params["id"],
    { isActive: false },
    { new: true }
  );

  if (!product) {
    sendError(res, "Produit introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, null, "Produit désactivé");
}


export async function getFeaturedProducts(_req: Request, res: Response): Promise<void> {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .sort({ "ratings.average": -1 })
    .limit(8)
    .lean();

  sendSuccess(res, products, "Produits vedettes récupérés");
}


export async function getCategories(_req: Request, res: Response): Promise<void> {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  sendSuccess(res, categories, "Catégories récupérées");
}