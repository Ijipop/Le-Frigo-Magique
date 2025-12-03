import { prisma } from "../prisma";
import { logger } from "./logger";
import { normalizeIngredientName, matchIngredients } from "./ingredientMatcher";
import { getFallbackPrice } from "./priceFallback";
import { getFlyerItems } from "./flippApi";

const FLIPP_BASE_URL = "https://backflipp.wishabi.com/flipp";

/**
 * Interface pour un prix d'ingrédient
 */
export interface IngredientPrice {
  prix: number;
  source: "cache" | "flipp" | "fallback" | "government";
  categorie?: string;
}

/**
 * Recherche un prix dans Flipp pour un ingrédient donné
 * 
 * @param ingredient - Nom de l'ingrédient à chercher
 * @param postalCode - Code postal pour filtrer les flyers
 * @returns Prix trouvé ou null
 */
async function searchFlippPrice(
  ingredient: string,
  postalCode: string
): Promise<number | null> {
  try {
    // 1. Récupérer les flyers pour le code postal
    const flyersUrl = new URL(`${FLIPP_BASE_URL}/flyers`);
    flyersUrl.searchParams.set("postal_code", postalCode);

    const flyersRes = await fetch(flyersUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!flyersRes.ok) {
      logger.warn("Erreur lors de la récupération des flyers Flipp", {
        status: flyersRes.status,
        ingredient,
      });
      return null;
    }

    const flyersData = await flyersRes.json();
    const allFlyers: any[] = Array.isArray(flyersData)
      ? flyersData
      : Array.isArray((flyersData as any).flyers)
        ? (flyersData as any).flyers
        : [];

    // Filtrer seulement les épiceries
    const groceryFlyers = allFlyers.filter((flyer: any) => {
      const merchant = (flyer?.merchant || "").toLowerCase();
      const name = (flyer?.merchant_name || flyer?.name || "").toLowerCase();
      const groceryKeywords = [
        "metro", "maxi", "iga", "super c", "walmart", "provigo", "loblaws",
        "sobeys", "food basics", "costco", "adonis", "uniprix", "pharmaprix",
      ];
      return groceryKeywords.some((kw) => merchant.includes(kw) || name.includes(kw));
    });

    if (groceryFlyers.length === 0) {
      logger.debug("Aucun flyer d'épicerie trouvé", { ingredient, postalCode });
      return null;
    }

    // 2. Chercher dans les premiers flyers (limiter à 3 pour performance)
    const flyersToSearch = groceryFlyers.slice(0, 3);
    const normalizedIngredient = normalizeIngredientName(ingredient);
    const prices: number[] = [];

    for (const flyer of flyersToSearch) {
      const flyerId = flyer.id || flyer.flyer_id;
      if (!flyerId) continue;

      try {
        const { items } = await getFlyerItems(flyerId);
        
        // Chercher un match dans les items
        for (const item of items) {
          const itemName = normalizeIngredientName(item.name || "");
          
          if (matchIngredients(normalizedIngredient, itemName)) {
            // Prioriser le prix régulier (original_price), sinon current_price
            const price = item.original_price || item.current_price;
            if (price && price > 0) {
              prices.push(price);
              logger.debug("Prix trouvé dans Flipp", {
                ingredient,
                itemName: item.name,
                price,
                flyer: flyer.merchant || flyer.merchant_name,
              });
            }
          }
        }
      } catch (error) {
        logger.warn("Erreur lors de la récupération des items d'un flyer", {
          error: error instanceof Error ? error.message : String(error),
          flyerId,
        });
        continue;
      }
    }

    // Retourner le prix moyen si on a trouvé des prix
    if (prices.length > 0) {
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      return Math.round(averagePrice * 100) / 100; // Arrondir à 2 décimales
    }

    return null;
  } catch (error) {
    logger.error("Erreur lors de la recherche Flipp", undefined, {
      error: error instanceof Error ? error.message : String(error),
      ingredient,
    });
    return null;
  }
}

/**
 * Obtient le prix d'un ingrédient avec système de cache hybride
 * 
 * Stratégie:
 * 1. Chercher dans le cache DB (ingrédients courants)
 * 2. Si pas trouvé → Appel Flipp API (dynamique)
 * 3. Si Flipp échoue → Fallback interne (prix moyens)
 * 
 * @param ingredient - Nom de l'ingrédient
 * @param postalCode - Code postal pour Flipp (optionnel)
 * @returns Prix de l'ingrédient
 */
export async function getIngredientPrice(
  ingredient: string,
  postalCode?: string
): Promise<IngredientPrice> {
  if (!ingredient || !ingredient.trim()) {
    // Retourner un prix par défaut si ingrédient vide
    const fallback = getFallbackPrice("autres");
    return {
      prix: fallback?.prix || 5.00,
      source: "fallback",
      categorie: "autres",
    };
  }

  const normalized = normalizeIngredientName(ingredient);

  // 1. Chercher dans le cache DB (priorité aux prix gouvernementaux)
  try {
    // Chercher d'abord les prix gouvernementaux (source="government")
    let cached = await prisma.prixIngredient.findFirst({
      where: { 
        nom: normalized,
        source: "government",
      },
    });

    // Si pas trouvé, chercher n'importe quel prix (Flipp, etc.)
    if (!cached) {
      cached = await prisma.prixIngredient.findUnique({
        where: { nom: normalized },
      });
    }

    if (cached) {
      logger.debug("Prix trouvé dans le cache DB", {
        ingredient,
        normalized,
        prix: cached.prixMoyen,
        source: cached.source,
      });
      return {
        prix: cached.prixMoyen,
        source: cached.source === "government" ? "government" : "cache",
        categorie: cached.categorie || undefined,
      };
    }
  } catch (error) {
    logger.warn("Erreur lors de la recherche dans le cache DB", {
      error: error instanceof Error ? error.message : String(error),
      ingredient,
    });
  }

  // 2. Appel Flipp API (dynamique) - seulement si code postal fourni
  if (postalCode) {
    const flippPrice = await searchFlippPrice(ingredient, postalCode);
    
    if (flippPrice) {
      // Sauvegarder dans le cache pour la prochaine fois
      try {
        const category = getFallbackPrice(ingredient)?.categorie || null;
        await prisma.prixIngredient.upsert({
          where: { nom: normalized },
          create: {
            nom: normalized,
            prixMoyen: flippPrice,
            categorie: category,
            source: "flipp",
          },
          update: {
            prixMoyen: flippPrice,
            updatedAt: new Date(),
          },
        });
        
        logger.info("Prix sauvegardé dans le cache", {
          ingredient,
          normalized,
          prix: flippPrice,
          source: "flipp",
        });
      } catch (error) {
        logger.warn("Erreur lors de la sauvegarde du prix dans le cache", {
          error: error instanceof Error ? error.message : String(error),
          ingredient,
        });
      }

      return {
        prix: flippPrice,
        source: "flipp",
      };
    }
  }

  // 3. Fallback interne
  const fallback = getFallbackPrice(ingredient);
  if (fallback) {
    logger.debug("Prix de fallback utilisé", {
      ingredient,
      normalized,
      prix: fallback.prix,
      categorie: fallback.categorie,
    });
    return {
      prix: fallback.prix,
      source: "fallback",
      categorie: fallback.categorie,
    };
  }

  // Dernier recours : prix par défaut
  logger.warn("Aucun prix trouvé, utilisation du prix par défaut", {
    ingredient,
    normalized,
  });
  return {
    prix: 5.00, // Prix par défaut
    source: "fallback",
    categorie: "autres",
  };
}

/**
 * Extrait les ingrédients d'une recette depuis son titre et snippet
 * 
 * Version simple : extraction basique depuis le texte
 * (Peut être améliorée avec GPT plus tard)
 * 
 * @param recipe - Objet recette avec title et snippet
 * @returns Liste d'ingrédients extraits
 */
export function extractIngredientsFromRecipe(recipe: {
  title: string;
  snippet?: string;
}): string[] {
  const text = `${recipe.title} ${recipe.snippet || ""}`.toLowerCase();
  
  // Liste d'ingrédients courants à chercher
  const commonIngredients = [
    "poulet", "boeuf", "bœuf", "porc", "saumon", "thon", "crevette",
    "pâtes", "pates", "riz", "quinoa", "spaghetti",
    "tomate", "carotte", "poivron", "oignon", "ail", "patate", "pomme de terre",
    "lait", "fromage", "beurre", "crème", "yogourt", "yaourt",
    "huile", "vinaigre", "farine", "sucre", "oeuf", "œuf", "pain",
    "légumes", "fruits", "herbes", "épices",
  ];

  const found: string[] = [];
  
  for (const ingredient of commonIngredients) {
    if (text.includes(ingredient)) {
      found.push(ingredient);
    }
  }

  // Dédupliquer
  return [...new Set(found)];
}

/**
 * Calcule le coût estimé d'une recette
 * 
 * @param recipe - Objet recette
 * @param postalCode - Code postal pour Flipp (optionnel)
 * @returns Coût total estimé en dollars CAD
 */
export async function calculateRecipeCost(
  recipe: {
    title: string;
    snippet?: string;
  },
  postalCode?: string
): Promise<{
  cost: number;
  ingredients: Array<{ name: string; price: number; source: string }>;
}> {
  const ingredients = extractIngredientsFromRecipe(recipe);
  
  if (ingredients.length === 0) {
    // Si aucun ingrédient trouvé, estimation basée sur le type de recette
    const estimatedCost = 8.00; // Coût moyen par défaut
    return {
      cost: estimatedCost,
      ingredients: [],
    };
  }

  const ingredientPrices: Array<{ name: string; price: number; source: string }> = [];
  let totalCost = 0;

  for (const ingredient of ingredients) {
    const priceInfo = await getIngredientPrice(ingredient, postalCode);
    ingredientPrices.push({
      name: ingredient,
      price: priceInfo.prix,
      source: priceInfo.source,
    });
    totalCost += priceInfo.prix;
  }

  // Arrondir à 2 décimales
  totalCost = Math.round(totalCost * 100) / 100;

  return {
    cost: totalCost,
    ingredients: ingredientPrices,
  };
}

