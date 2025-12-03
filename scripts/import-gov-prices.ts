/**
 * Script d'import des prix gouvernementaux du Québec dans la BD Neon
 * 
 * Usage: npx tsx scripts/import-gov-prices.ts
 * 
 * Ce script:
 * 1. Parse le CSV gouvernemental
 * 2. Filtre pour le Québec uniquement
 * 3. Utilise les données les plus récentes
 * 4. Convertit les prix en unités standard
 * 5. Importe dans la table PrixIngredient avec source="government"
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

// Créer le pool de connexions PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

// Créer l'instance Prisma avec l'adapter
const prisma = new PrismaClient({
  adapter,
  log: ["query", "info", "warn", "error"],
});

/**
 * Parse une ligne CSV avec séparateur point-virgule
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Normalise le nom d'un ingrédient (similaire à normalizeIngredientName)
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trouve la catégorie d'un ingrédient
 */
function findCategory(ingredient: string): string | null {
  const normalized = ingredient.toLowerCase();
  
  if (normalized.includes("poulet") || normalized.includes("boeuf") || normalized.includes("bœuf") || 
      normalized.includes("porc") || normalized.includes("agneau") || normalized.includes("veau") ||
      normalized.includes("saucisse") || normalized.includes("bacon") || normalized.includes("jambon") ||
      normalized.includes("steak")) {
    return "viande";
  }
  
  if (normalized.includes("saumon") || normalized.includes("thon") || normalized.includes("morue") ||
      normalized.includes("crevette") || normalized.includes("poisson") || normalized.includes("homard") ||
      normalized.includes("crabe") || normalized.includes("fruits de mer")) {
    return "poisson";
  }
  
  if (normalized.includes("lait") || normalized.includes("fromage") || normalized.includes("beurre") ||
      normalized.includes("yogourt") || normalized.includes("yaourt") || normalized.includes("crème") ||
      normalized.includes("œuf") || normalized.includes("oeuf")) {
    return "laitier";
  }
  
  if (normalized.includes("pomme") || normalized.includes("orange") || normalized.includes("banane") ||
      normalized.includes("fraise") || normalized.includes("bleuet") || normalized.includes("raisin") ||
      normalized.includes("avocat") || normalized.includes("citron") || normalized.includes("lime")) {
    return "fruits";
  }
  
  if (normalized.includes("tomate") || normalized.includes("carotte") || normalized.includes("oignon") ||
      normalized.includes("poivron") || normalized.includes("pomme de terre") || normalized.includes("patate") ||
      normalized.includes("salade") || normalized.includes("laitue") || normalized.includes("chou") ||
      normalized.includes("brocoli") || normalized.includes("courgette") || normalized.includes("aubergine") ||
      normalized.includes("champignon") || normalized.includes("épinard") || normalized.includes("asperge")) {
    return "legumes";
  }
  
  if (normalized.includes("pâtes") || normalized.includes("pates") || normalized.includes("riz") ||
      normalized.includes("quinoa") || normalized.includes("couscous") || normalized.includes("farine") ||
      normalized.includes("pain") || normalized.includes("céréale")) {
    return "cereales";
  }
  
  if (normalized.includes("haricot") || normalized.includes("lentille") || normalized.includes("pois") ||
      normalized.includes("fève") || normalized.includes("tofu") || normalized.includes("chickpea")) {
    return "legumineuses";
  }
  
  if (normalized.includes("huile") || normalized.includes("vinaigre") || normalized.includes("sucre") ||
      normalized.includes("sel") || normalized.includes("poivre") || normalized.includes("épice") ||
      normalized.includes("herbe")) {
    return "epices";
  }
  
  return "autres";
}

async function importGovPrices() {
  console.log("🚀 Début de l'import des prix gouvernementaux...");
  
  try {
    // Chemin vers le fichier CSV
    const csvPath = path.join(process.cwd(), "public", "prixqc", "aliment_qc_prix.csv");
    
    if (!fs.existsSync(csvPath)) {
      console.error("❌ Fichier CSV non trouvé:", csvPath);
      process.exit(1);
    }

    console.log("📖 Lecture du fichier CSV...");
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n");
    
    // Map pour stocker les prix par produit (garder les plus récents)
    const productPrices = new Map<string, { prix: number; periode: string; unite: string; produit: string }>();
    
    console.log("🔄 Parsing du CSV...");
    let processedLines = 0;
    
    // Parser les lignes (ignorer l'en-tête)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const columns = parseCSVLine(line);
        
        if (columns.length < 11) continue;
        
        const periode = columns[0]?.replace(/"/g, "") || "";
        const geo = columns[1]?.replace(/"/g, "") || "";
        const produit = columns[3]?.replace(/"/g, "") || "";
        const valeur = columns[10]?.replace(/"/g, "") || "";
        
        // Filtrer pour le Québec uniquement
        if (geo !== "Québec") continue;
        
        // Ignorer les valeurs vides ou ".."
        if (!valeur || valeur === ".." || valeur.trim() === "") continue;
        
        const prix = parseFloat(valeur);
        if (isNaN(prix) || prix <= 0) continue;
        
        // Extraire l'unité du nom du produit
        const uniteMatch = produit.match(/(\d+(?:[.,]\d+)?)\s*(grammes?|kilogrammes?|litres?|millilitres?|unité|douzaine)/i);
        const unite = uniteMatch ? uniteMatch[0] : "";
        
        // Normaliser le nom du produit (enlever l'unité)
        let produitNormalise = produit
          .replace(/,\s*\d+(?:[.,]\d+)?\s*(grammes?|kilogrammes?|litres?|millilitres?|unité|douzaine)/gi, "")
          .replace(/par\s+kilogramme/gi, "")
          .replace(/par\s+unité/gi, "")
          .trim();
        
        // Normaliser pour la clé
        const key = normalizeIngredientName(produitNormalise);
        
        // Garder seulement les prix les plus récents
        const existing = productPrices.get(key);
        if (!existing || periode > existing.periode) {
          productPrices.set(key, { prix, periode, unite, produit: produitNormalise });
        }
        
        processedLines++;
        if (processedLines % 1000 === 0) {
          console.log(`  📊 ${processedLines} lignes traitées...`);
        }
      } catch (error) {
        // Ignorer les lignes mal formées
        continue;
      }
    }
    
    console.log(`✅ ${productPrices.size} produits uniques trouvés pour le Québec`);
    
    // Convertir les prix en prix par unité standard (kg, L, unité)
    console.log("🔄 Conversion des prix en unités standard...");
    const pricesToImport: Array<{ nom: string; prixMoyen: number; categorie: string | null; source: string }> = [];
    
    // Produits non-alimentaires à exclure ou traiter différemment
    const nonAlimentaires = [
      'détergent', 'shampooing', 'dentifrice', 'déodorant', 'savon', 'papier', 
      'essuie-tout', 'serviette', 'mouchoir', 'couche', 'tampon', 'serviette hygiénique'
    ];
    
    for (const [key, data] of productPrices.entries()) {
      const produitLower = data.produit.toLowerCase();
      
      // Vérifier si c'est un produit non-alimentaire
      const isNonAlimentaire = nonAlimentaires.some(na => produitLower.includes(na));
      
      let prixFinal = data.prix;
      
      // Pour les produits non-alimentaires, garder le prix tel quel (prix par unité/paquet)
      if (isNonAlimentaire) {
        // Ne pas convertir, garder le prix du paquet/unité
        // Ex: "Déodorant, 85 grammes" à 4.71$ → garder 4.71$ (prix du déodorant)
        prixFinal = data.prix;
      } else {
        // Pour les aliments, convertir selon l'unité
        const uniteLower = data.unite.toLowerCase();
        
        if (uniteLower.includes("gramme")) {
          // Extraire le poids en grammes
          const weightMatch = data.unite.match(/(\d+(?:[.,]\d+)?)/);
          if (weightMatch) {
            const weightG = parseFloat(weightMatch[1].replace(",", "."));
            if (weightG > 0 && weightG < 10000) { // Éviter les conversions aberrantes
              // Convertir en prix par kg
              prixFinal = (prixFinal / weightG) * 1000;
            }
          }
        } else if (uniteLower.includes("millilitre")) {
          // Extraire le volume en ml
          const volumeMatch = data.unite.match(/(\d+(?:[.,]\d+)?)/);
          if (volumeMatch) {
            const volumeMl = parseFloat(volumeMatch[1].replace(",", "."));
            if (volumeMl > 0 && volumeMl < 10000) { // Éviter les conversions aberrantes
              // Convertir en prix par L
              prixFinal = (prixFinal / volumeMl) * 1000;
            }
          }
        } else if (uniteLower.includes("litre") && !uniteLower.includes("millilitre")) {
          // Pour les litres (ex: "4,43 litres"), garder le prix tel quel
          // C'est déjà le prix pour le volume indiqué
          prixFinal = data.prix;
        } else if (uniteLower.includes("douzaine")) {
          // Pour les œufs, convertir en prix par unité
          prixFinal = prixFinal / 12; // Prix par œuf
        }
        // Pour "par kilogramme", "par litre", "unité", on garde tel quel
      }
      
      const categorie = findCategory(data.produit);
      
      // Ne pas importer les produits non-alimentaires (ils ne sont pas des ingrédients)
      if (!isNonAlimentaire) {
        pricesToImport.push({
          nom: key,
          prixMoyen: prixFinal,
          categorie,
          source: "government",
        });
      }
    }
    
    console.log(`💾 Import de ${pricesToImport.length} prix dans la BD...`);
    
    // Supprimer les produits non-alimentaires existants (détergent, shampooing, etc.)
    console.log("🧹 Nettoyage des produits non-alimentaires...");
    const produitsNonAlimentaires = [
      'détergent à lessive', 'shampooing', 'dentifrice', 'déodorant', 'savon', 
      'papier', 'essuie-tout', 'serviette', 'mouchoir', 'couche', 'tampon', 
      'serviette hygiénique', 'détergent', 'lessive'
    ];
    
    let deleted = 0;
    for (const nom of produitsNonAlimentaires) {
      try {
        const normalized = normalizeIngredientName(nom);
        const result = await prisma.prixIngredient.deleteMany({
          where: {
            nom: { contains: normalized },
            source: "government",
          },
        });
        deleted += result.count;
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    if (deleted > 0) {
      console.log(`  🗑️  ${deleted} produit(s) non-alimentaire(s) supprimé(s)`);
    }
    
    // Importer dans la BD (upsert pour éviter les doublons)
    let imported = 0;
    let updated = 0;
    let errors = 0;
    
    for (const priceData of pricesToImport) {
      try {
        const result = await prisma.prixIngredient.upsert({
          where: { nom: priceData.nom },
          create: {
            nom: priceData.nom,
            prixMoyen: priceData.prixMoyen,
            categorie: priceData.categorie,
            source: priceData.source,
          },
          update: {
            prixMoyen: priceData.prixMoyen,
            categorie: priceData.categorie,
            source: priceData.source,
            updatedAt: new Date(),
          },
        });
        
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          imported++;
        } else {
          updated++;
        }
      } catch (error) {
        errors++;
        console.error(`❌ Erreur pour ${priceData.nom}:`, error);
      }
    }
    
    console.log("\n✅ Import terminé !");
    console.log(`  📥 ${imported} nouveaux prix importés`);
    console.log(`  🔄 ${updated} prix mis à jour`);
    if (errors > 0) {
      console.log(`  ⚠️  ${errors} erreurs`);
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de l'import:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Exécuter le script
importGovPrices();

