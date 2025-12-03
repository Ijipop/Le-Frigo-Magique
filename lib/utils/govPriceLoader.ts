/**
 * Chargeur de prix gouvernementaux du Québec
 * Utilise l'API route pour charger les prix depuis le CSV
 * Compatible côté client et serveur
 */

import { normalizeIngredientName } from "./ingredientMatcher";

/**
 * Trouve un prix gouvernemental pour un ingrédient
 * Appelle l'API route qui charge les données depuis le CSV
 * 
 * Note: Cette fonction est asynchrone car elle fait un appel API
 */
export async function getGovPrice(ingredient: string): Promise<number | null> {
  if (!ingredient || !ingredient.trim()) {
    return null;
  }

  try {
    // Normaliser le nom de l'ingrédient
    const normalized = normalizeIngredientName(ingredient);
    
    // Appeler l'API route
    const response = await fetch(`/api/gov-prices?ingredient=${encodeURIComponent(normalized)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    
    if (result.success && result.data?.prix !== null && result.data?.prix !== undefined) {
      return result.data.prix;
    }
    
    return null;
  } catch (error) {
    // En cas d'erreur (ex: côté serveur sans fetch), retourner null
    // Le fallback manuel sera utilisé
    return null;
  }
}

