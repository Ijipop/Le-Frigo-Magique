import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  pool: Pool;
  adapter: PrismaPg;
};

// Créer le Pool une seule fois (singleton pattern)
const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

// Créer l'adapter une seule fois (singleton pattern)
const adapter =
  globalForPrisma.adapter ||
  new PrismaPg(pool);

// Créer le PrismaClient une seule fois (singleton pattern)
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

// En développement, stocker les instances dans global pour éviter les fuites lors du hot reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
  globalForPrisma.adapter = adapter;
}
