import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";
import type { UserRole, ShippingAddress } from "../types/index.js";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  addresses: ShippingAddress[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Méthode d'instance
  comparePassword(candidate: string): Promise<boolean>;
}

const shippingAddressSchema = new Schema<ShippingAddress>(
  {
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    wilaya: { type: String, required: true },
    postalCode: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: true }
);

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "Le prénom est obligatoire"],
      trim: true,
      maxlength: [50, "Le prénom ne peut pas dépasser 50 caractères"],
    },
    lastName: {
      type: String,
      required: [true, "Le nom est obligatoire"],
      trim: true,
      maxlength: [50, "Le nom ne peut pas dépasser 50 caractères"],
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Format d'email invalide"],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est obligatoire"],
      minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
      select: false, // Jamais retourné dans les queries par défaut
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    phone: {
      type: String,
      trim: true,
    },
    addresses: {
      type: [shippingAddressSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Index ──────────────────────────────────────────────────
userSchema.index({ email: 1 });

// ── Hook pre-save : hachage du mot de passe ────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// ── Méthode : comparaison du mot de passe ──────────────────
userSchema.methods["comparePassword"] = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

// ── Supprimer le mot de passe des réponses JSON ────────────
userSchema.methods["toJSON"] = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>("User", userSchema);