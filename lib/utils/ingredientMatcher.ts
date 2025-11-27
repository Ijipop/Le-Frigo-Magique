/**
 * Normalise une chaîne de caractères pour le matching
 * - Enlève les accents
 * - Met en minuscules
 * - Trim les espaces
 * - Enlève les caractères spéciaux superflus
 */
export function normalizeIngredientName(name: string): string {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    // Enlever les accents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Enlever les caractères spéciaux (garder lettres, chiffres, espaces)
    .replace(/[^a-z0-9\s]/g, " ")
    // Remplacer les espaces multiples par un seul
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vérifie si deux noms d'ingrédients correspondent
 * Utilise un matching flexible (contains) après normalisation
 */
export function matchIngredients(
  ingredient1: string,
  ingredient2: string
): boolean {
  const normalized1 = normalizeIngredientName(ingredient1);
  const normalized2 = normalizeIngredientName(ingredient2);

  if (!normalized1 || !normalized2) return false;

  // Match exact après normalisation
  if (normalized1 === normalized2) return true;

  // Match partiel (un contient l'autre)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Vérifier que ce n'est pas trop court (éviter les faux positifs)
    const minLength = Math.min(normalized1.length, normalized2.length);
    if (minLength >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Trouve les matches entre une liste d'ingrédients et des items de flyer
 * Retourne un tableau de matches avec les détails
 */
export function findMatchesInFlyerItems(
  ingredients: string[],
  flyerItems: Array<{ name: string; [key: string]: any }>
): Array<{
  ingredient: string;
  matchedItem: any;
  matchScore: number;
}> {
  const matches: Array<{
    ingredient: string;
    matchedItem: any;
    matchScore: number;
  }> = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeIngredientName(ingredient);

    for (const item of flyerItems) {
      const itemName = item.name || "";
      const normalizedItemName = normalizeIngredientName(itemName);

      if (matchIngredients(normalizedIngredient, normalizedItemName)) {
        // Calculer un score de match (plus le match est exact, plus le score est élevé)
        let matchScore = 0;
        if (normalizedIngredient === normalizedItemName) {
          matchScore = 100; // Match exact
        } else if (normalizedItemName.includes(normalizedIngredient)) {
          matchScore = 80; // L'item contient l'ingrédient
        } else if (normalizedIngredient.includes(normalizedItemName)) {
          matchScore = 60; // L'ingrédient contient l'item
        } else {
          matchScore = 40; // Match partiel
        }

        matches.push({
          ingredient,
          matchedItem: item,
          matchScore,
        });

        // Ne garder qu'un seul match par ingrédient (le meilleur)
        break;
      }
    }
  }

  // Trier par score décroissant
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

