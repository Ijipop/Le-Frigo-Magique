/**
 * Calcul du coût d'une recette Spoonacular en tenant compte :
 * - Des ingrédients du garde-manger (coût = 0 si disponible)
 * - Des rabais Flipp
 * - Des coûts moyens backup
 */

import { getRecipePriceBreakdown } from "./spoonacular";
import { getIngredientPrice } from "./ingredientPrice";
import { normalizeIngredientName, matchIngredients } from "./ingredientMatcher";
import { translateIngredientToFrench } from "./ingredientTranslator";
import { prisma } from "../prisma";
import { logger } from "./logger";

// Taux de change USD/CAD (1 CAD = 0.74 USD, donc 1 USD = 1/0.74 CAD ≈ 1.35 CAD)
const USD_TO_CAD_RATE = 1 / 0.74; // ≈ 1.35135

export interface SpoonacularRecipeCostResult {
  totalCost: number; // Coût total en dollars CAD
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    price: number; // Prix en dollars CAD
    source: "garde-manger" | "flipp" | "cache" | "fallback" | "spoonacular";
    inPantry: boolean; // Si l'ingrédient est dans le garde-manger
  }>;
  savingsFromPantry: number; // Économies grâce au garde-manger
  originalCost: number; // Coût sans tenir compte du garde-manger
}

/**
 * Calcule le coût d'une recette Spoonacular en tenant compte du garde-manger
 * 
 * @param recipeId - ID de la recette Spoonacular
 * @param userId - ID de l'utilisateur (pour le garde-manger)
 * @param postalCode - Code postal pour Flipp (optionnel)
 * @returns Coût détaillé avec breakdown
 */
export async function calculateSpoonacularRecipeCost(
  recipeId: number,
  userId: string,
  postalCode?: string
): Promise<SpoonacularRecipeCostResult> {
  try {
    logger.info("Calcul du coût Spoonacular avec garde-manger", { recipeId, userId });

    // 1. Récupérer le breakdown depuis Spoonacular
    const breakdown = await getRecipePriceBreakdown(recipeId);
    
    // 2. Récupérer le garde-manger de l'utilisateur
    const gardeManger = await prisma.articleGardeManger.findMany({
      where: { utilisateurId: userId },
    });

    // Normaliser les noms du garde-manger pour la comparaison
    const pantryItems = gardeManger.map(item => ({
      ...item,
      normalizedName: normalizeIngredientName(item.nom),
    }));

    // 3. Calculer le coût de chaque ingrédient
    const ingredientsWithCost: SpoonacularRecipeCostResult["ingredients"] = [];
    let totalCost = 0;
    let originalCost = 0;

    for (const spoonIngredient of breakdown.ingredients) {
      // Traduire l'ingrédient anglais vers le français
      const frenchName = translateIngredientToFrench(spoonIngredient.name);
      const normalizedSpoonName = normalizeIngredientName(frenchName);
      
      logger.debug("Ingrédient Spoonacular traduit", {
        original: spoonIngredient.name,
        translated: frenchName,
        normalized: normalizedSpoonName,
      });
      
      // Vérifier si l'ingrédient est dans le garde-manger
      let inPantry = false;
      let pantryItem = null;
      
      for (const pantryItem of pantryItems) {
        if (matchIngredients(normalizedSpoonName, pantryItem.normalizedName)) {
          // Vérifier si on a assez dans le garde-manger
          // Pour simplifier, on assume qu'on a assez si la quantité > 0
          // TODO: Améliorer pour vérifier les quantités exactes
          if (pantryItem.quantite > 0) {
            inPantry = true;
            break;
          }
        }
      }

      let ingredientCost = 0;
      let source: "garde-manger" | "flipp" | "cache" | "fallback" | "spoonacular" = "spoonacular";

      if (inPantry) {
        // L'ingrédient est dans le garde-manger, coût = 0
        ingredientCost = 0;
        source = "garde-manger";
      } else {
        // Chercher le prix via notre système (Flipp, cache, fallback)
        // Utiliser le nom français traduit pour la recherche
        try {
          const priceInfo = await getIngredientPrice(frenchName, postalCode);
          
          // Convertir la quantité Spoonacular vers notre système
          // Spoonacular donne le prix en centimes USD, on doit convertir en CAD
          // Mais on préfère utiliser nos prix locaux (Flipp/cache/fallback) qui sont en CAD
          
          // Calculer le coût basé sur la quantité
          const quantity = spoonIngredient.amount || 1;
          const unit = spoonIngredient.unit || "";
          
          // Ajuster le prix selon la quantité et l'unité
          ingredientCost = adjustPriceForQuantity(priceInfo.prix, quantity, unit);
          source = priceInfo.source === "flipp" ? "flipp" : 
                   priceInfo.source === "cache" ? "cache" : "fallback";
        } catch (error) {
          logger.warn("Erreur lors de la récupération du prix, utilisation du prix Spoonacular", {
            error: error instanceof Error ? error.message : String(error),
            ingredient: spoonIngredient.name,
          });
          
          // Fallback: utiliser le prix Spoonacular (convertir de centimes USD en dollars CAD)
          const priceUSD = spoonIngredient.price / 100; // Convertir centimes -> dollars USD
          const priceCAD = priceUSD * USD_TO_CAD_RATE; // Convertir USD -> CAD
          ingredientCost = priceCAD;
          source = "spoonacular";
        }
      }

      // Coût original (sans tenir compte du garde-manger)
      let originalIngredientCost = ingredientCost;
      if (inPantry) {
        // Calculer ce que ça coûterait si on n'avait pas l'ingrédient
        try {
          const priceInfo = await getIngredientPrice(frenchName, postalCode);
          originalIngredientCost = adjustPriceForQuantity(
            priceInfo.prix,
            spoonIngredient.amount,
            spoonIngredient.unit
          );
        } catch (error) {
          // Si erreur, utiliser le prix Spoonacular (convertir de centimes USD en dollars CAD)
          const priceUSD = spoonIngredient.price / 100;
          originalIngredientCost = priceUSD * USD_TO_CAD_RATE;
        }
      }

      originalCost += originalIngredientCost;

      ingredientsWithCost.push({
        name: frenchName, // Utiliser le nom français traduit
        amount: spoonIngredient.amount || 0,
        unit: spoonIngredient.unit || "",
        price: Math.round(ingredientCost * 100) / 100,
        source,
        inPantry,
      });

      totalCost += ingredientCost;
    }

    const savingsFromPantry = originalCost - totalCost;
    const roundedTotal = Math.round(totalCost * 100) / 100;
    const roundedOriginal = Math.round(originalCost * 100) / 100;
    const roundedSavings = Math.round(savingsFromPantry * 100) / 100;

    logger.info("Coût Spoonacular calculé", {
      recipeId,
      totalCost: roundedTotal,
      originalCost: roundedOriginal,
      savings: roundedSavings,
      ingredientsCount: ingredientsWithCost.length,
    });

    return {
      totalCost: roundedTotal,
      ingredients: ingredientsWithCost,
      savingsFromPantry: roundedSavings,
      originalCost: roundedOriginal,
    };

  } catch (error) {
    logger.error("Erreur lors du calcul du coût Spoonacular", error instanceof Error ? error : new Error(String(error)), {
      recipeId,
      userId,
    });
    throw error;
  }
}

/**
 * Ajuste le prix selon la quantité et l'unité
 */
function adjustPriceForQuantity(
  basePrice: number,
  quantity: number,
  unit: string
): number {
  const unitLower = unit.toLowerCase();

  // Conversions de base
  const conversions: { [key: string]: number } = {
    "g": 1,
    "kg": 1000,
    "ml": 1,
    "l": 1000,
    "tasse": 250,
    "tasses": 250,
    "cuillère à soupe": 15,
    "c. à soupe": 15,
    "cuillère à thé": 5,
    "c. à thé": 5,
  };

  // Si l'unité est en grammes/ml, le prix de base est généralement pour 1kg/1L
  if (unitLower.includes("g") || unitLower.includes("ml")) {
    return (basePrice / 1000) * quantity;
  }
  
  // Si l'unité est en kg/l, multiplier directement
  if (unitLower.includes("kg") || unitLower.includes("l") || unitLower.includes("litre")) {
    return basePrice * quantity;
  }
  
  // Pour les tasses, cuillères, etc.
  if (unitLower.includes("tasse")) {
    return (basePrice / 1000) * (quantity * 250);
  } else if (unitLower.includes("soupe") || unitLower.includes("c. à soupe")) {
    return (basePrice / 1000) * (quantity * 15);
  } else if (unitLower.includes("thé") || unitLower.includes("c. à thé")) {
    return (basePrice / 1000) * (quantity * 5);
  }

  // Pour les unités comme "tranche", "gousse", "unité"
  if (unitLower.includes("tranche") || unitLower.includes("gousse") || unitLower.includes("unité")) {
    return (basePrice / 12) * quantity; // Assumer un paquet de 12
  }

  // Par défaut, utiliser une fraction conservatrice
  return (basePrice / 20) * quantity;
}

