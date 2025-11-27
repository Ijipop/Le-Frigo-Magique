import { parseRecipeIngredients } from "./recipeParser";
import { getIngredientPrice } from "./ingredientPrice";
import { logger } from "./logger";

/**
 * Calcule le coût détaillé d'une recette en extrayant les ingrédients réels
 * 
 * APPROCHE LÉGALE :
 * - Extraction minimale (ingrédients uniquement, données factuelles)
 * - Pas de stockage du contenu complet
 * - Attribution à la source originale
 * - Respect des robots.txt
 * 
 * Cette fonction est appelée uniquement à la demande de l'utilisateur
 * (quand il sélectionne une recette), pas automatiquement.
 */
export interface DetailedCostResult {
  totalCost: number;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    price: number;
    source: string;
  }>;
  servings?: number;
  costPerServing?: number;
  source: string;
  method: "detailed_parsing";
}

/**
 * Calcule le coût détaillé d'une recette en extrayant les ingrédients réels
 * 
 * @param url - URL de la recette
 * @param postalCode - Code postal pour les prix Flipp (optionnel)
 * @returns Coût détaillé avec breakdown par ingrédient
 */
export async function calculateDetailedRecipeCost(
  url: string,
  postalCode?: string
): Promise<DetailedCostResult> {
  try {
    logger.info("Calcul détaillé du coût de la recette", { url });

    // 1. Parser la recette pour extraire les ingrédients (légal)
    const parsed = await parseRecipeIngredients(url);

    if (parsed.ingredients.length === 0) {
      logger.warn("Aucun ingrédient trouvé, utilisation de l'estimation par défaut", { url });
      // Fallback : estimation par défaut
      return {
        totalCost: 10.00,
        ingredients: [],
        servings: parsed.servings,
        costPerServing: parsed.servings ? 10.00 / parsed.servings : undefined,
        source: url,
        method: "detailed_parsing",
      };
    }

    // 2. Calculer le prix de chaque ingrédient
    const ingredientsWithPrice = await Promise.all(
      parsed.ingredients.map(async (ingredient) => {
        try {
          // Obtenir le prix de l'ingrédient
          // Note: getIngredientPrice retourne un prix moyen qui peut être pour différentes quantités
          // selon l'ingrédient (ex: pâtes = prix pour 500g, poulet = prix pour 1kg, œufs = prix pour 12 unités)
          const priceInfo = await getIngredientPrice(ingredient.name, postalCode);
          
          // Le prix de base doit être interprété selon le type d'ingrédient
          // On doit ajuster selon la quantité réelle utilisée dans la recette
          let adjustedPrice = 0;
          
          if (ingredient.quantity && ingredient.unit) {
            // Parser la quantité (ex: "2", "1/2", "500")
            const quantity = parseQuantity(ingredient.quantity);
            
            if (quantity > 0) {
              // Ajuster selon l'unité - le prix de base est interprété selon l'unité
              adjustedPrice = adjustPriceForUnit(priceInfo.prix, quantity, ingredient.unit);
            } else {
              // Si quantité = 0 ou invalide, utiliser une portion minimale (ex: 1/10 du prix)
              adjustedPrice = priceInfo.prix * 0.1;
            }
          } else if (ingredient.quantity) {
            // Quantité sans unité - interpréter selon le type d'ingrédient
            const quantity = parseQuantity(ingredient.quantity);
            
            // Déterminer si c'est probablement des unités ou des grammes selon l'ingrédient
            const ingredientLower = ingredient.name.toLowerCase();
            const isCountable = ingredientLower.includes("œuf") || ingredientLower.includes("oeuf") || 
                               ingredientLower.includes("gousse") || ingredientLower.includes("tranche") ||
                               ingredientLower.includes("tête") || ingredientLower.includes("unité");
            
            if (isCountable && quantity > 0 && quantity <= 20) {
              // Pour les ingrédients comptables (œufs, gousses, etc.), le prix de base est souvent pour un paquet
              // Exemple: œufs = 4.79$ pour 12, donc 2 œufs = (4.79 / 12) * 2
              adjustedPrice = (priceInfo.prix / 12) * quantity; // Assumer un paquet de 12
            } else if (quantity > 0 && quantity <= 10) {
              // Petit nombre sans unité - probablement des unités
              adjustedPrice = (priceInfo.prix / 10) * quantity; // Assumer que le prix est pour 10 unités
            } else {
              // Grand nombre - probablement des grammes
              adjustedPrice = (priceInfo.prix / 1000) * quantity; // Assumer que le prix est pour 1kg
            }
          } else {
            // Pas de quantité spécifiée - utiliser une portion très conservatrice
            // Assumer qu'on utilise environ 1/10 à 1/5 du prix de base (portion typique dans une recette)
            adjustedPrice = priceInfo.prix * 0.15; // 15% du prix de base
          }
          
          // S'assurer que le prix ajusté est raisonnable
          // Max: 1.5x le prix de base pour un ingrédient (au cas où on utiliserait beaucoup)
          // Min: 0.05$ (prix minimum pour un ingrédient)
          adjustedPrice = Math.max(0.05, Math.min(adjustedPrice, priceInfo.prix * 1.5));

          return {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            price: Math.round(adjustedPrice * 100) / 100,
            source: priceInfo.source,
          };
        } catch (error) {
          logger.warn("Erreur lors du calcul du prix d'un ingrédient", {
            error: error instanceof Error ? error.message : String(error),
            ingredient: ingredient.name,
          });
          // Prix par défaut si erreur
          return {
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            price: 2.00, // Prix par défaut par ingrédient
            source: "fallback",
          };
        }
      })
    );

    // 3. Calculer le coût total
    const totalCost = ingredientsWithPrice.reduce((sum, ing) => sum + ing.price, 0);
    const roundedTotal = Math.round(totalCost * 100) / 100;

    // 4. Calculer le coût par portion si disponible
    const costPerServing = parsed.servings && parsed.servings > 0
      ? Math.round((roundedTotal / parsed.servings) * 100) / 100
      : undefined;

    logger.info("Coût détaillé calculé", {
      url,
      totalCost: roundedTotal,
      ingredientsCount: ingredientsWithPrice.length,
      servings: parsed.servings,
    });

    return {
      totalCost: roundedTotal,
      ingredients: ingredientsWithPrice,
      servings: parsed.servings,
      costPerServing,
      source: url,
      method: "detailed_parsing",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error(
      "Erreur lors du calcul détaillé du coût",
      error instanceof Error ? error : new Error(errorMessage),
      {
        message: errorMessage,
        stack: errorStack,
        url,
      }
    );
    
    // Si c'est une erreur de parsing, retourner une estimation par défaut plutôt que d'échouer
    if (errorMessage.includes("parsing") || errorMessage.includes("timeout") || errorMessage.includes("HTTP")) {
      logger.warn("Erreur de parsing, utilisation de l'estimation par défaut", { url, error: errorMessage });
      return {
        totalCost: 10.00,
        ingredients: [],
        servings: undefined,
        costPerServing: undefined,
        source: url,
        method: "detailed_parsing",
      };
    }
    
    throw error;
  }
}

/**
 * Parse une quantité (ex: "2", "1/2", "500")
 */
function parseQuantity(quantityStr: string): number {
  // Fraction (ex: "1/2")
  const fractionMatch = quantityStr.match(/(\d+)\/(\d+)/);
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    if (denominator > 0) {
      return numerator / denominator;
    }
  }

  // Nombre décimal (ex: "2.5", "500")
  const number = parseFloat(quantityStr);
  return isNaN(number) ? 1 : number;
}

/**
 * Ajuste le prix selon l'unité
 * Exemple: 500g de farine à 4.99$ pour 1kg = 2.50$
 */
function adjustPriceForUnit(
  basePrice: number,
  quantity: number,
  unit: string
): number {
  const unitLower = unit.toLowerCase();

  // Conversions de base (approximatives)
  // Ces conversions sont des estimations moyennes
  const conversions: { [key: string]: number } = {
    // Poids
    "g": 1,
    "kg": 1000,
    "oz": 28.35,
    "lb": 453.6,
    "livre": 453.6,
    "livres": 453.6,
    
    // Volume
    "ml": 1,
    "l": 1000,
    "litre": 1000,
    "litres": 1000,
    "tasse": 250, // 1 tasse = 250ml
    "tasses": 250,
    "cuillère à soupe": 15,
    "c. à soupe": 15,
    "cuillère à thé": 5,
    "c. à thé": 5,
    "c. à café": 5,
  };

  // Trouver la conversion
  let multiplier = 1;
  for (const [key, value] of Object.entries(conversions)) {
    if (unitLower.includes(key)) {
      multiplier = value;
      break;
    }
  }

  // Le prix de base peut être pour différentes quantités selon l'ingrédient
  // On doit calculer le coût pour la quantité réelle utilisée
  
  // Si l'unité est en grammes/ml, le prix de base est généralement pour 1kg/1L
  // Donc on divise par 1000 et multiplie par la quantité en grammes/ml
  if (unitLower.includes("g") || unitLower.includes("ml")) {
    // Exemple: 500g de farine, prix de base = 4.99$ pour 1kg
    // Coût = (4.99 / 1000) * 500 = 2.50$
    return (basePrice / 1000) * quantity;
  }
  
  // Si l'unité est en kg/l, multiplier directement (le prix est déjà pour 1kg/1L)
  if (unitLower.includes("kg") || unitLower.includes("l") || unitLower.includes("litre")) {
    return basePrice * quantity;
  }
  
  // Pour les tasses, cuillères, etc. - utiliser des conversions approximatives
  // Une tasse = environ 250ml, donc on traite comme des ml
  if (unitLower.includes("tasse") || unitLower.includes("cuillère")) {
    // Convertir en ml approximatif
    let mlEquivalent = quantity;
    if (unitLower.includes("tasse")) {
      mlEquivalent = quantity * 250;
    } else if (unitLower.includes("soupe") || unitLower.includes("c. à soupe")) {
      mlEquivalent = quantity * 15;
    } else if (unitLower.includes("thé") || unitLower.includes("c. à thé") || unitLower.includes("café")) {
      mlEquivalent = quantity * 5;
    }
    // Traiter comme des ml (prix pour 1L, donc diviser par 1000)
    return (basePrice / 1000) * mlEquivalent;
  }
  
  // Pour les unités comme "tranche", "gousse", "tête", "unité" - utiliser une fraction du prix
  // Exemple: 2 gousses d'ail sur un paquet de 10 = 2/10 du prix
  if (unitLower.includes("tranche") || unitLower.includes("gousse") || unitLower.includes("tête") || unitLower.includes("unité")) {
    // Assumer qu'une unité = environ 1/10 à 1/15 du prix de base (pour un paquet/container typique)
    // Exemple: gousses d'ail = 1.99$ pour ~10 gousses, donc 2 gousses = (1.99 / 10) * 2 = 0.40$
    return (basePrice / 12) * quantity;
  }

  // Pour les autres unités non reconnues, utiliser une fraction très conservatrice
  // (assumer que c'est une petite portion, environ 1/20 du prix de base)
  return (basePrice / 20) * quantity;
}

