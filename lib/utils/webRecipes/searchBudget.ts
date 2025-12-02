/**
 * Recherche de recettes par budget uniquement (Spoonacular)
 */

import { NextResponse } from "next/server";
import { searchRecipesByBudget } from "../spoonacular";
import { logger } from "../logger";
import { prisma } from "../../prisma";
import { getOrCreateUser } from "../user";

export interface BudgetSearchParams {
  budget: string;
  typeRepas?: string;
  allergies: string[];
  maxResults: number;
  userId?: string | null;
  nbJours?: string;
  filtersArray?: string[];
}

export interface BudgetSearchResult {
  items: any[];
  cached: boolean;
  source: string;
  error?: string;
  details?: string;
}

/**
 * Recherche de recettes par budget uniquement via Spoonacular
 */
export async function searchByBudgetOnly(
  params: BudgetSearchParams
): Promise<BudgetSearchResult | null> {
  const { budget, typeRepas, allergies, maxResults, userId, nbJours, filtersArray = [] } = params;

  try {
    let budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return {
        items: [],
        cached: false,
        source: "spoonacular",
        error: "Budget invalide",
      };
    }

    // Calculer le nombre de recettes à retourner en fonction du nombre de jours
    let actualMaxResults = maxResults;
    if (nbJours) {
      const nbJoursNum = parseInt(nbJours);
      if (!isNaN(nbJoursNum) && nbJoursNum > 0 && nbJoursNum <= 7) {
        actualMaxResults = nbJoursNum + 1; // 2 pour 1 jour, 3 pour 2 jours, etc.
        console.log(`📅 [API] Limitation à ${actualMaxResults} recette(s) pour ${nbJoursNum} jour(s)`);
      }
    }

    // Extraire typeRepas des filtres si présent
    const typeRepasFilter = filtersArray.find(f => ['dejeuner', 'diner', 'souper', 'collation'].includes(f));
    const finalTypeRepas = typeRepasFilter || typeRepas;

    // 🎯 LOGIQUE DU BUDGET :
    // - Si c'est une recherche unique (1 repas seulement, pas de nbJours ou nbJours = 1 et 1 seul type de repas)
    //   → Utiliser un montant raisonnable (budget hebdomadaire / 21 repas = budget par repas moyen)
    // - Si c'est une recherche complète (plusieurs repas, nbJours > 1 ou plusieurs types de repas)
    //   → Le budget passé est déjà le budget par repas calculé (depuis QuickSettings)
    const isSingleMealSearch = !nbJours || (nbJours && parseInt(nbJours) === 1 && typeRepasFilter);
    
    if (isSingleMealSearch) {
      // Recherche unique : calculer un budget raisonnable basé sur le budget hebdomadaire
      // On assume que le budget hebdomadaire est pour 21 repas (7 déjeuners + 7 dîners + 7 soupers)
      // Budget par repas moyen = budget hebdomadaire / 21
      // Mais on peut être plus flexible pour une recherche unique (ex: jusqu'à 2x le budget moyen)
      const budgetParRepasMoyen = budgetNum / 21; // Budget hebdomadaire / 21 repas
      const budgetRaisonnable = Math.max(budgetParRepasMoyen * 2, 5); // Au moins 5$ ou 2x le budget moyen
      budgetNum = Math.min(budgetRaisonnable, 20); // Maximum 20$ pour une recherche unique
      console.log(`💰 [API] Recherche unique détectée - Budget ajusté: ${budgetNum.toFixed(2)}$ (budget hebdomadaire: ${budget}$, budget moyen par repas: ${budgetParRepasMoyen.toFixed(2)}$)`);
    } else {
      // Recherche complète : le budget passé est déjà le budget par repas calculé
      console.log(`💰 [API] Recherche complète - Budget par repas: ${budgetNum.toFixed(2)}$`);
    }

    // Récupérer le code postal si utilisateur connecté
    let postalCode: string | undefined;
    if (userId) {
      try {
        const utilisateur = await getOrCreateUser(userId);
        if (utilisateur) {
          const preferences = await prisma.preferences.findUnique({
            where: { utilisateurId: utilisateur.id },
          });
          postalCode = (preferences as any)?.codePostal || undefined;
        }
      } catch (error) {
        logger.warn("Erreur lors de la récupération des préférences", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log("🍴 [Spoonacular] Recherche par budget:", {
      budget: budgetNum,
      typeRepas,
      allergies: allergies.length,
      maxResults,
    });

    // Rechercher via Spoonacular
    const spoonacularResults = await searchRecipesByBudget(
      budgetNum,
      finalTypeRepas,
      allergies,
      actualMaxResults * 2 // Demander 2x plus pour compenser le filtrage
    );

    if (spoonacularResults.length === 0) {
      return {
        items: [],
        cached: false,
        source: "spoonacular",
      };
    }

    // Filtrer les recettes déjà dans "Recettes de la semaine" si utilisateur connecté
    let filteredResults = spoonacularResults;
    if (userId) {
      try {
        const utilisateur = await getOrCreateUser(userId);
        if (utilisateur) {
          const recettesSemaine = await prisma.recetteSemaine.findMany({
            where: { utilisateurId: utilisateur.id },
          });

          const existingUrls = new Set(
            recettesSemaine.map((r) => r.url).filter(Boolean)
          );
          const existingSpoonacularIds = new Set(
            recettesSemaine
              .map((r) => (r as any).spoonacularId)
              .filter((id): id is number => id !== null && id !== undefined)
          );

          filteredResults = spoonacularResults.filter((recipe) => {
            if (recipe.url && existingUrls.has(recipe.url)) return false;
            if (recipe.spoonacularId && existingSpoonacularIds.has(recipe.spoonacularId))
              return false;
            return true;
          });

          console.log(
            `✅ [Spoonacular] ${filteredResults.length} recette(s) après exclusion (${spoonacularResults.length - filteredResults.length} déjà dans la semaine)`
          );
        }
      } catch (error) {
        logger.warn("Erreur lors du filtrage des recettes existantes", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Trier par coût croissant
    filteredResults.sort(
      (a, b) => (a.estimatedCost || 0) - (b.estimatedCost || 0)
    );

    // Limiter selon actualMaxResults
    const limitedResults = filteredResults.slice(0, actualMaxResults);

    if (limitedResults.length < actualMaxResults) {
      console.log(
        `⚠️ [API] Seulement ${limitedResults.length} recette(s) disponible(s) après exclusion (${actualMaxResults} demandé(s))`
      );
    }

    console.log(`✅ [Spoonacular] Retour de ${limitedResults.length} recette(s)`);

    // Calculer automatiquement le coût détaillé pour les 3 premières recettes
    const AUTO_CALCULATE_COUNT = 3;
    const resultsWithDetailedCost = await Promise.all(
      limitedResults.map(async (recipe, index) => {
        if (index < AUTO_CALCULATE_COUNT && recipe.spoonacularId && userId) {
          try {
            const utilisateur = await getOrCreateUser(userId);
            if (utilisateur) {
              const preferences = await prisma.preferences.findUnique({
                where: { utilisateurId: utilisateur.id },
              });
              const postalCode = preferences?.codePostal || undefined;

              const { calculateSpoonacularRecipeCost } = await import(
                "../spoonacularRecipeCost"
              );
              const detailedCost = await calculateSpoonacularRecipeCost(
                recipe.spoonacularId,
                utilisateur.id,
                postalCode
              );

              return {
                ...recipe,
                detailedCost: {
                  totalCost: detailedCost.totalCost,
                  savingsFromPantry: detailedCost.savingsFromPantry,
                  originalCost: detailedCost.originalCost,
                  ingredients: detailedCost.ingredients,
                },
              };
            }
          } catch (error) {
            console.warn(
              `⚠️ [Spoonacular] Erreur lors du calcul du coût détaillé pour la recette ${recipe.spoonacularId}:`,
              error
            );
          }
        }
        return recipe;
      })
    );

    console.log(
      `✅ [Spoonacular] ${AUTO_CALCULATE_COUNT} recette(s) avec coût détaillé calculé automatiquement`
    );

    return {
      items: resultsWithDetailedCost,
      cached: false,
      source: "spoonacular",
    };
  } catch (error) {
    logger.error(
      "Erreur lors de la recherche Spoonacular",
      error instanceof Error ? error : new Error(String(error)),
      {
        budget,
        typeRepas,
        allergies,
      }
    );

    return {
      items: [],
      cached: false,
      source: "spoonacular",
      error: "Erreur lors de la recherche Spoonacular",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

