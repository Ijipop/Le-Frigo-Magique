/**
 * Script pour vérifier le contenu de la table PrixIngredient
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

async function checkPrixIngredient() {
  try {
    console.log("🔍 Vérification de la table PrixIngredient...\n");

    // Compter le nombre total d'enregistrements
    const totalCount = await prisma.prixIngredient.count();
    console.log(`📊 Total d'enregistrements: ${totalCount}`);

    // Compter par source
    const govCount = await prisma.prixIngredient.count({
      where: { source: "government" },
    });
    const flippCount = await prisma.prixIngredient.count({
      where: { source: "flipp" },
    });
    const otherCount = totalCount - govCount - flippCount;

    console.log(`\n📈 Répartition par source:`);
    console.log(`  🏛️  Gouvernementaux: ${govCount}`);
    console.log(`  🛒 Flipp: ${flippCount}`);
    console.log(`  📝 Autres: ${otherCount}`);

    // Afficher quelques exemples
    if (totalCount > 0) {
      console.log(`\n📋 Exemples d'enregistrements:`);
      
      const examples = await prisma.prixIngredient.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      examples.forEach((item, index) => {
        console.log(`\n  ${index + 1}. ${item.nom}`);
        console.log(`     Prix: ${item.prixMoyen.toFixed(2)}$`);
        console.log(`     Catégorie: ${item.categorie || "N/A"}`);
        console.log(`     Source: ${item.source}`);
        console.log(`     Créé: ${item.createdAt.toISOString()}`);
      });

      // Afficher quelques prix gouvernementaux spécifiquement
      if (govCount > 0) {
        console.log(`\n🏛️  Exemples de prix gouvernementaux:`);
        const govExamples = await prisma.prixIngredient.findMany({
          where: { source: "government" },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        govExamples.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.nom} - ${item.prixMoyen.toFixed(2)}$`);
        });
      }
    } else {
      console.log("\n⚠️  La table est vide !");
      console.log("💡 Exécutez 'npm run import-gov-prices' pour importer les prix gouvernementaux.");
    }

  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkPrixIngredient();

