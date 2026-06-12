// ============================================================
// Middleware d'authentification JWT
// ============================================================

import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import type { AuthRequest, JwtPayload, UserRole } from "../types/index.js";
import { sendError } from "../utils/helpers.js";

// ── Vérifier le JWT ────────────────────────────────────────
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Token d'authentification manquant", StatusCodes.UNAUTHORIZED);
    return;
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env["AUTH_SECRET"];

  if (!secret) {
    sendError(res, "Configuration serveur invalide", StatusCodes.INTERNAL_SERVER_ERROR);
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    sendError(res, "Token invalide ou expiré", StatusCodes.UNAUTHORIZED);
  }
}

// ── Vérifier le rôle ───────────────────────────────────────
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        "Accès refusé : droits insuffisants",
        StatusCodes.FORBIDDEN
      );
      return;
    }

    next();
  };
}

// ── Raccourci admin ────────────────────────────────────────
export const requireAdmin = requireRole("admin");

// ── Générer un token JWT ───────────────────────────────────
export function generateToken(payload: JwtPayload): string {
  const secret = process.env["AUTH_SECRET"];
  const expiresIn = process.env["JWT_EXPIRES_IN"] ?? "7d";

  if (!secret) throw new Error("AUTH_SECRET non défini");

  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}