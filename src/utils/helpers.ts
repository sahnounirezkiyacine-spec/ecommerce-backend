// ============================================================
// Utilitaires partagés
// ============================================================

import type { Response } from "express";
import type { ApiResponse, PaginationQuery, PaginatedResult } from "../types/index.js";

// ── Réponse succès standardisée ────────────────────────────
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Succès",
  statusCode = 200
): void {
  const response: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(response);
}

// ── Réponse erreur standardisée ────────────────────────────
export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: string[]
): void {
  const response: ApiResponse = { success: false, message, errors };
  res.status(statusCode).json(response);
}

// ── Parser les paramètres de pagination ───────────────────
export function parsePagination(query: Record<string, unknown>): Required<PaginationQuery> {
  const page = Math.max(1, parseInt(String(query["page"] ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query["limit"] ?? "20"), 10)));
  const sort = String(query["sort"] ?? "createdAt");
  const order = query["order"] === "asc" ? "asc" : "desc";
  return { page, limit, sort, order };
}

// ── Construire la réponse paginée ─────────────────────────
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    items,
    total,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ── Générer un slug depuis un texte ───────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Calculer les frais de port ─────────────────────────────
export function calculateShipping(subtotal: number): number {
  if (subtotal >= 10000) return 0;   // Gratuit à partir de 10 000 DA
  return 500;                         // Frais fixe : 500 DA
}

// ── Calculer la TVA (19% en Algérie) ──────────────────────
export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * 0.19 * 100) / 100;
}