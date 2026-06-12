// ============================================================
// Handlers Profil Utilisateur
// ============================================================

import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { User } from "../models/user.js";
import { sendSuccess, sendError } from "../utils/helpers.js";
import type { AuthRequest } from "../types/index.js";

// ── PUT /users/profile ─────────────────────────────────────
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { firstName, lastName, phone } = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $set: { firstName, lastName, phone } },
    { new: true, runValidators: true }
  );

  if (!user) {
    sendError(res, "Utilisateur introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  sendSuccess(res, user, "Profil mis à jour");
}

// ── PUT /users/password ────────────────────────────────────
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const user = await User.findById(req.user.userId).select("+password");
  if (!user) {
    sendError(res, "Utilisateur introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  const valid = await user.comparePassword(currentPassword);
  if (!valid) {
    sendError(res, "Mot de passe actuel incorrect", StatusCodes.UNAUTHORIZED);
    return;
  }

  user.password = newPassword;
  await user.save();

  sendSuccess(res, null, "Mot de passe changé avec succès");
}

// ── POST /users/addresses ──────────────────────────────────
export async function addAddress(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $push: { addresses: req.body } },
    { new: true }
  );

  sendSuccess(res, user?.addresses, "Adresse ajoutée", StatusCodes.CREATED);
}

// ── DELETE /users/addresses/:addressId ────────────────────
export async function removeAddress(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { sendError(res, "Non authentifié", StatusCodes.UNAUTHORIZED); return; }

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { $pull: { addresses: { _id: req.params["addressId"] } } },
    { new: true }
  );

  sendSuccess(res, user?.addresses, "Adresse supprimée");
}

// ── GET /admin/users (admin) ───────────────────────────────
export async function getAllUsers(req: AuthRequest, res: Response): Promise<void> {
  const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
  sendSuccess(res, users, "Utilisateurs récupérés");
}

// ── PUT /admin/users/:id/status (admin) ───────────────────
export async function toggleUserStatus(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.params["id"]);
  if (!user) {
    sendError(res, "Utilisateur introuvable", StatusCodes.NOT_FOUND);
    return;
  }

  if (req.user?.userId === String(user._id)) {
    sendError(res, "Vous ne pouvez pas désactiver votre propre compte", StatusCodes.BAD_REQUEST);
    return;
  }

  user.isActive = !user.isActive;
  await user.save();

  sendSuccess(res, user, `Compte ${user.isActive ? "activé" : "désactivé"}`);
}