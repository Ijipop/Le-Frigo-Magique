import { defineConfig } from "prisma/config";

// Charger dotenv seulement si disponible (pour les migrations)
try {
  require("dotenv/config");
} catch {
  // Ignore si dotenv n'est pas disponible
}

// URL placeholder pour la génération du client (n'a pas besoin d'être une vraie DB)
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
