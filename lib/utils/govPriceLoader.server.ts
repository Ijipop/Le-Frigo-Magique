/**
 * Chargeur de prix gouvernementaux du Québec (côté serveur uniquement)
 * Utilise les données du fichier CSV du gouvernement canadien
 * pour obtenir des prix réalistes basés sur les statistiques officielles
 */

import fs from "fs";
import path from "path";

// Cache en mémoire pour éviter de recharger le CSV à chaque fois
let priceCache: Map<string, number> | null = null;
let lastCacheLoad: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 heure

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
 * Charge les prix gouvernementaux depuis le CSV
 * Filtre pour le Québec et utilise les données les plus récentes
 */
export function loadGovPrices(): Map<string, number> {
  // Vérifier le cache
  const now = Date.now();
  if (priceCache && (now - lastCacheLoad) < CACHE_DURATION) {
    return priceCache;
  }

  const prices = new Map<string, number>();
  
  try {
    // Chemin vers le fichier CSV
    const csvPath = path.join(process.cwd(), "public", "prixqc", "aliment_qc_prix.csv");
    
    if (!fs.existsSync(csvPath)) {
      console.warn("⚠️ [GovPrice] Fichier CSV non trouvé:", csvPath);
      return prices;
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n");
    
    // Map pour stocker les prix par produit (garder les plus récents)
    const productPrices = new Map<string, { prix: number; periode: string; unite: string }>();
    
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
        
        // Clé pour le produit
        const key = produitNormalise.toLowerCase();
        
        // Garder seulement les prix les plus récents
        const existing = productPrices.get(key);
        if (!existing || periode > existing.periode) {
          productPrices.set(key, { prix, periode, unite });
        }
      } catch (error) {
        // Ignorer les lignes mal formées
        continue;
      }
    }
    
    // Convertir les prix en prix par unité standard (kg, L, unité)
    for (const [key, data] of productPrices.entries()) {
      let prixFinal = data.prix;
      
      // Convertir selon l'unité
      const uniteLower = data.unite.toLowerCase();
      
      if (uniteLower.includes("gramme")) {
        // Extraire le poids en grammes
        const weightMatch = data.unite.match(/(\d+(?:[.,]\d+)?)/);
        if (weightMatch) {
          const weightG = parseFloat(weightMatch[1].replace(",", "."));
          if (weightG > 0) {
            // Convertir en prix par kg
            prixFinal = (prixFinal / weightG) * 1000;
          }
        }
      } else if (uniteLower.includes("millilitre")) {
        // Extraire le volume en ml
        const volumeMatch = data.unite.match(/(\d+(?:[.,]\d+)?)/);
        if (volumeMatch) {
          const volumeMl = parseFloat(volumeMatch[1].replace(",", "."));
          if (volumeMl > 0) {
            // Convertir en prix par L
            prixFinal = (prixFinal / volumeMl) * 1000;
          }
        }
      } else if (uniteLower.includes("douzaine")) {
        // Pour les œufs, convertir en prix par unité
        prixFinal = prixFinal / 12; // Prix par œuf
      }
      // Pour "par kilogramme", "par litre", "unité", on garde tel quel
      
      prices.set(key, prixFinal);
    }
    
    console.log(`✅ [GovPrice] ${prices.size} prix chargés depuis le CSV gouvernemental`);
    priceCache = prices;
    lastCacheLoad = now;
    
  } catch (error) {
    console.error("❌ [GovPrice] Erreur lors du chargement du CSV:", error);
  }
  
  return prices;
}

/**
 * Trouve un prix gouvernemental pour un ingrédient
 * Utilise la correspondance de noms normalisés
 */
export function getGovPrice(ingredient: string): number | null {
  const prices = loadGovPrices();
  if (prices.size === 0) return null;
  
  const normalized = ingredient.toLowerCase().trim();
  
  // Chercher un match exact
  if (prices.has(normalized)) {
    return prices.get(normalized)!;
  }
  
  // Chercher un match partiel (le produit contient l'ingrédient ou vice versa)
  for (const [produit, prix] of prices.entries()) {
    // Si l'ingrédient normalisé est contenu dans le produit
    if (produit.includes(normalized) || normalized.includes(produit)) {
      return prix;
    }
  }
  
  // Chercher par mots-clés communs
  const keywords = normalized.split(/\s+/).filter(w => w.length > 3);
  for (const keyword of keywords) {
    for (const [produit, prix] of prices.entries()) {
      if (produit.includes(keyword)) {
        return prix;
      }
    }
  }
  
  return null;
}

