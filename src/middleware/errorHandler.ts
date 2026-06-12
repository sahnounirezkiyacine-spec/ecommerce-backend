// ============================================================
// Middleware de gestion des erreurs globales
// ============================================================

import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { Error as MongooseError } from "mongoose";

// ── Gestionnaire d'erreurs global ─────────────────────────
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("❌ Erreur :", err);

  // Erreur de validation Mongoose
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: "Erreur de validation",
      errors,
    });
    return;
  }

  // Clé unique dupliquée (code 11000)
  if ((err as NodeJS.ErrnoException).name === "MongoServerError" && "code" in err && (err as { code?: number }).code === 11000) {
    res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: "Cette valeur existe déjà",
    });
    return;
  }

  // ObjectId invalide
  if (err instanceof MongooseError.CastError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Identifiant invalide",
    });
    return;
  }

  // Erreur générique
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message:
      process.env["NODE_ENV"] === "development"
        ? err.message
        : "Erreur interne du serveur",
  });
}

// ── Route non trouvée ──────────────────────────────────────
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Route introuvable",
  });
}