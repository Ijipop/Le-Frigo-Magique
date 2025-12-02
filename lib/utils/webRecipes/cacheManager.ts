/**
 * Gestion du cache pour les recherches de recettes
 */

import { getCachedResults, saveCache } from "../../webSearchCache";
import { logger } from "../logger";

const MIN_CACHE_RECIPES = 20; // Minimum de recettes dans le cache pour l'utiliser

export interface CacheCheckResult {
  useCache: boolean;
  cachedItems: any[];
  shouldEnrich: boolean;
}

/**
 * Vérifie le cache et détermine si on doit l'utiliser ou faire une nouvelle recherche
 */
export async function checkCache(
  cacheKey: string,
  ingredientsArray: string[]
): Promise<CacheCheckResult> {
  const cached = await getCachedResults(cacheKey);

  if (cached && cached.length >= MIN_CACHE_RECIPES) {
    // Cache suffisant, utiliser avec mélange aléatoire
    const shuffled = [...cached].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(20, shuffled.length));

    logger.info("Cache suffisant, utilisation avec mélange aléatoire", {
      cacheSize: cached.length,
      selected: selected.length,
    });

    return {
      useCache: true,
      cachedItems: selected,
      shouldEnrich: false,
    };
  } else if (cached && cached.length > 0 && cached.length < MIN_CACHE_RECIPES) {
    // Cache insuffisant, nouvelle recherche nécessaire mais on garde le cache pour enrichissement
    logger.info("Cache insuffisant, nouvelle recherche nécessaire", {
      cacheSize: cached.length,
      minRequired: MIN_CACHE_RECIPES,
    });

    return {
      useCache: false,
      cachedItems: cached, // Garder pour enrichissement
      shouldEnrich: true,
    };
  } else {
    // Pas de cache
    logger.info("Aucun cache trouvé, nouvelle recherche nécessaire");

    return {
      useCache: false,
      cachedItems: [],
      shouldEnrich: false,
    };
  }
}

/**
 * Enrichit le cache avec de nouveaux résultats
 */
export async function enrichCache(
  cacheKey: string,
  newItems: any[],
  merge: boolean = true
): Promise<void> {
  if (newItems.length > 0) {
    await saveCache(cacheKey, newItems, merge);
    logger.info("Cache enrichi avec de nouvelles recettes", {
      newItems: newItems.length,
      merge,
    });
  }
}

