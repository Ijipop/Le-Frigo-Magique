/**
 * Normalise les URLs d'images de recettes
 * Remplace les URLs vers foodista.com ou autres sites défaillants
 * par les URLs Spoonacular directes
 */

/**
 * Normalise une URL d'image de recette
 * 
 * @param imageUrl - URL de l'image (peut être null/undefined)
 * @param spoonacularId - ID Spoonacular de la recette (optionnel)
 * @returns URL normalisée ou null si invalide
 */
export function normalizeRecipeImage(
  imageUrl: string | null | undefined,
  spoonacularId?: number | null
): string | null {
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return null;
  }

  const trimmed = imageUrl.trim();

  // Si c'est déjà une URL Spoonacular valide, la retourner
  if (trimmed.includes('spoonacular.com') && !trimmed.includes('foodista.com')) {
    // Normaliser pour utiliser img.spoonacular.com
    if (trimmed.includes('recipeImages')) {
      return trimmed;
    }
    // Si c'est une URL spoonacular.com mais pas recipeImages, essayer de construire l'URL
    const idMatch = trimmed.match(/recipes\/(\d+)/);
    if (idMatch && idMatch[1]) {
      return `https://img.spoonacular.com/recipeImages/${idMatch[1]}-312x231.jpg`;
    }
  }

  // Si c'est une URL foodista.com ou autre site défaillant, essayer de récupérer l'ID Spoonacular
  if (trimmed.includes('foodista.com') || trimmed.includes('food.com') || trimmed.includes('allrecipes.com')) {
    // Essayer d'extraire l'ID depuis l'URL
    const idMatch = trimmed.match(/(\d+)/);
    if (idMatch && idMatch[1]) {
      const extractedId = parseInt(idMatch[1], 10);
      if (!isNaN(extractedId) && extractedId > 0) {
        return `https://img.spoonacular.com/recipeImages/${extractedId}-312x231.jpg`;
      }
    }
    
    // Si on a un spoonacularId fourni, l'utiliser
    if (spoonacularId && spoonacularId > 0) {
      return `https://img.spoonacular.com/recipeImages/${spoonacularId}-312x231.jpg`;
    }
    
    // Si on ne peut pas récupérer l'ID, retourner null pour utiliser un placeholder
    return null;
  }

  // Si c'est une URL valide (http/https), la retourner telle quelle
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Si on a un spoonacularId et que l'URL est invalide, construire l'URL Spoonacular
  if (spoonacularId && spoonacularId > 0) {
    return `https://img.spoonacular.com/recipeImages/${spoonacularId}-312x231.jpg`;
  }

  // Sinon, retourner null pour utiliser un placeholder
  return null;
}

/**
 * Vérifie si une URL d'image est valide et accessible
 * 
 * @param imageUrl - URL de l'image
 * @returns true si l'URL semble valide
 */
export function isValidImageUrl(imageUrl: string | null | undefined): boolean {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  const trimmed = imageUrl.trim();
  
  // Vérifier que c'est une URL valide
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }

  // Exclure les sites connus pour être défaillants
  const blockedDomains = ['foodista.com', 'food.com/favicon.ico'];
  if (blockedDomains.some(domain => trimmed.includes(domain))) {
    return false;
  }

  return true;
}

