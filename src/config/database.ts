// ============================================================
// Connexion MongoDB via Mongoose
// ============================================================

import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const uri = process.env["MONGODB_URI"];

  if (!uri) {
    throw new Error("MONGODB_URI manquant dans les variables d'environnement");
  }

  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connecté : ${mongoose.connection.host}`);
  } catch (error) {
    console.error("❌ Échec de connexion MongoDB :", error);
    process.exit(1);
  }
}

// Écoute des événements Mongoose
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB déconnecté");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Erreur MongoDB :", err);
});