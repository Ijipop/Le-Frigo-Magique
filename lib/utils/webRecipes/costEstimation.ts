/**
 * Estimation des coûts et enrichissement des recettes
 */

import { extractServingsFromText } from "../recipeParser";
import { estimateRecipeCost } from "../recipeCostEstimator";
import { logger } from "../logger";

export interface RecipeWithCost {
  title?: string;
  snippet?: string;
  url?: string;
  source?: string;
  estimatedCost?: number | null;
  costSource?: string;
  servings?: number | null;
}

/**
 * Estime le coût d'une recette et extrait les portions
 */
export async function estimateRecipeCostAndServings(
  item: RecipeWithCost
): Promise<RecipeWithCost> {
  try {
    const result = await estimateRecipeCost(item.title || "", item.snippet || "");

    // S'assurer que les portions sont bien présentes (ré-extraire si nécessaire)
    let servings = item.servings;
    if (!servings || servings === undefined) {
      const fullText = `${item.title || ""} ${item.snippet || ""}`;
      servings = extractServingsFromText(fullText) || undefined;
    }

    return {
      ...item,
      estimatedCost: result.estimatedCost,
      costSource: result.source, // "gpt" ou "rules"
      servings: servings,
    };
  } catch (error) {
    logger.warn("Erreur lors de l'estimation du coût d'une recette", {
      error: error instanceof Error ? error.message : String(error),
      title: item.title,
    });

    // Ré-extraire les portions même en cas d'erreur
    let servings = item.servings;
    if (!servings || servings === undefined) {
      const fullText = `${item.title || ""} ${item.snippet || ""}`;
      servings = extractServingsFromText(fullText) || undefined;
    }

    return {
      ...item,
      estimatedCost: 10.00, // Coût total par défaut (fallback si estimation échoue)
      costSource: "fallback",
      servings: servings,
    };
  }
}

/**
 * Filtre et sélectionne les recettes selon le budget
 */
export function filterAndSelectByBudget(
  items: RecipeWithCost[],
  budget: number | null
): RecipeWithCost[] {
  if (!budget || budget <= 0) {
    // Pas de budget, sélectionner aléatoirement entre 10 et 15 recettes
    const minReturn = 10;
    const maxReturn = 15;

    if (items.length >= minReturn) {
      // Mélanger et prendre entre 10 et 15 recettes
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      const count = Math.min(maxReturn, items.length);
      return shuffled.slice(0, count);
    } else {
      // Si on a moins de 10, on retourne toutes
      return items;
    }
  }

  // Filtrer les recettes qui respectent le budget
  const itemsInBudget = items.filter((item) => {
    if (item.estimatedCost === null || item.estimatedCost === undefined) {
      // Si on n'a pas pu estimer le coût, on garde la recette (fallback)
      return true;
    }
    return item.estimatedCost <= budget;
  });

  // Si on n'a pas assez de recettes dans le budget, assouplir le filtre
  let finalItems = itemsInBudget;
  if (itemsInBudget.length < 10) {
    // Assouplir : accepter les recettes jusqu'à 150% du budget
    const relaxedBudget = budget * 1.5;
    const itemsRelaxed = items.filter((item) => {
      if (item.estimatedCost === null || item.estimatedCost === undefined) {
        return true;
      }
      return item.estimatedCost <= relaxedBudget;
    });

    // Trier par coût croissant (prioriser celles dans le budget strict)
    itemsRelaxed.sort((a, b) => {
      const costA = a.estimatedCost ?? Infinity;
      const costB = b.estimatedCost ?? Infinity;
      const inBudgetA = costA <= budget ? 0 : 1;
      const inBudgetB = costB <= budget ? 0 : 1;

      // D'abord celles dans le budget strict, puis par coût
      if (inBudgetA !== inBudgetB) {
        return inBudgetA - inBudgetB;
      }
      return costA - costB;
    });

    finalItems = itemsRelaxed;

    logger.warn("Budget assoupli pour avoir plus de résultats", {
      budgetStrict: budget,
      budgetRelaxed: relaxedBudget,
      recettesDansBudgetStrict: itemsInBudget.length,
      recettesDansBudgetRelaxe: itemsRelaxed.length,
    });
  } else {
    // Trier par coût croissant (moins cher en premier)
    finalItems.sort((a, b) => {
      const costA = a.estimatedCost ?? Infinity;
      const costB = b.estimatedCost ?? Infinity;
      return costA - costB;
    });
  }

  // Sélectionner aléatoirement entre 10 et 15 recettes parmi celles qui respectent le budget
  const minReturn = 10;
  const maxReturn = 15;

  if (finalItems.length >= minReturn) {
    // Mélanger et prendre entre 10 et 15 recettes
    const shuffled = [...finalItems].sort(() => Math.random() - 0.5);
    const count = Math.min(maxReturn, finalItems.length);
    return shuffled.slice(0, count);
  } else {
    // Si on a moins de 10, on retourne toutes
    return finalItems;
  }
}

