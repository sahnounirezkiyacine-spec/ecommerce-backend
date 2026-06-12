// ============================================================
// Handlers Authentification
// ============================================================

import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User } from "../models/user.js";
import { generateToken } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import type { AuthRequest } from "../types/index.js";

// ── POST /auth/register ────────────────────────────────────
export async function register(req: AuthRequest, res: Response): Promise<void> {
  const { firstName, lastName, email, password, phone } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  };

  const existing = await User.findOne({ email });
  if (existing) {
    sendError(res, "Cet email est déjà utilisé", StatusCodes.CONFLICT);
    return;
  }

  const user = await User.create({ firstName, lastName, email, password, phone });

  const token = generateToken({
    userId: String(user._id),
    email: user.email,
    role: user.role,
  });

  sendSuccess(
    res,
    { token, user },
    "Inscription réussie",
    StatusCodes.CREATED
  );
}

// ── POST /auth/login ───────────────────────────────────────
export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email, isActive: true }).select("+password");
  if (!user) {
    sendError(res, "Email ou mot de passe incorrect", StatusCodes.UNAUTHORIZED);
    return;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    sendError(res, "Email ou mot de passe incorrect", StatusCodes.UNAUTHORIZED);
    return;
  }

  const token = generateToken({
    userId: String(user._id),
    email: user.email,
    role: user.role,
  });

  // Ne pas retourner le password
  const userObj = user.toJSON();

  sendSuccess(res, { token, user: userObj }, "Connexion réussie");
}

// ── GET /auth/me ───────────────────────────────────────────
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED);
    return;
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    sendError(res, "Utilisateur introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, user, "Profil récupéré");
}