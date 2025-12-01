import { prisma } from "../prisma";

/**
 * Interface pour les résultats de recherche Spoonacular en cache
 */
export interface CachedSpoonacularSearchResult {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
  estimatedCost: number;
  servings: number | undefined;
  spoonacularId?: number;
}

/**
 * Crée une clé de cache unique basée sur les paramètres de recherche
 */
export function createSearchCacheKey(
  maxPrice: number,
  typeRepas?: string,
  allergies: string[] = [],
  maxResults: number = 20
): string {
  const allergiesKey = allergies.sort().join(',');
  return `spoonacular:${maxPrice}:${typeRepas || 'any'}:${allergiesKey}:${maxResults}`;
}

/**
 * Récupère les résultats de recherche Spoonacular depuis le cache
 * @param cacheKey - Clé de cache unique
 * @param maxResults - Nombre maximum de résultats à retourner (pour limiter après mélange)
 * @returns Les résultats en cache ou null si le cache est expiré/inexistant
 */
export async function getCachedSpoonacularSearch(
  cacheKey: string,
  maxResults?: number
): Promise<CachedSpoonacularSearchResult[] | null> {
  try {
    const cached = await (prisma as any).spoonacularSearchCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      console.log("🔍 [Spoonacular Cache] Aucun cache trouvé pour:", cacheKey.substring(0, 100));
      return null;
    }

    console.log("✅ [Spoonacular Cache] Cache trouvé pour:", cacheKey.substring(0, 100));

    // Le cache est permanent (pas d'expiration) pour maximiser l'économie d'appels API
    // Parser les résultats JSON
    try {
      let results = cached.resultsJson as any as CachedSpoonacularSearchResult[];
      console.log(`📦 [Spoonacular Cache] ${results.length} résultat(s) parsés depuis le cache`);
      
      // 🎲 IMPORTANT : Mélanger les résultats du cache pour avoir de la variété à chaque fois
      // Sinon, on retourne toujours les mêmes recettes dans le même ordre
      const shuffledResults = [...results];
      for (let i = shuffledResults.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledResults[i], shuffledResults[j]] = [shuffledResults[j], shuffledResults[i]];
      }
      
      // Limiter aux maxResults demandés APRÈS le mélange
      // Utiliser le maxResults passé en paramètre (priorité) ou celui du cache
      const limit = maxResults || cached.maxResults || results.length;
      const limitedResults = shuffledResults.slice(0, limit);
      console.log(`🎲 [Spoonacular Cache] ${limitedResults.length} résultat(s) retourné(s) après mélange aléatoire (sur ${results.length} en cache)`);
      
      return limitedResults;
    } catch (error) {
      console.error("❌ [Spoonacular Cache] Erreur lors du parsing du cache:", error);
      return null;
    }
  } catch (error) {
    console.error("❌ [Spoonacular Cache] Erreur lors de la récupération du cache:", error);
    return null;
  }
}

/**
 * Sauvegarde les résultats de recherche Spoonacular dans le cache
 * @param cacheKey - Clé de cache unique
 * @param maxPrice - Budget maximum
 * @param typeRepas - Type de repas (optionnel)
 * @param allergies - Liste des allergies
 * @param maxResults - Nombre de résultats
 * @param results - Les résultats à mettre en cache
 */
export async function saveCachedSpoonacularSearch(
  cacheKey: string,
  maxPrice: number,
  typeRepas: string | undefined,
  allergies: string[],
  maxResults: number,
  results: CachedSpoonacularSearchResult[]
): Promise<void> {
  try {
    await (prisma as any).spoonacularSearchCache.upsert({
      where: { cacheKey },
      update: {
        resultsJson: results as any,
        maxPrice,
        typeRepas: typeRepas || null,
        allergies: allergies.sort().join(','),
        maxResults,
        updatedAt: new Date(),
      },
      create: {
        cacheKey,
        maxPrice,
        typeRepas: typeRepas || null,
        allergies: allergies.sort().join(','),
        maxResults,
        resultsJson: results as any,
      },
    });

    console.log(`💾 [Spoonacular Cache] ${results.length} résultat(s) sauvegardés dans le cache pour:`, cacheKey.substring(0, 100));
  } catch (error) {
    console.error("❌ [Spoonacular Cache] Erreur lors de la sauvegarde du cache:", error);
    // Ne pas faire échouer la fonction si le cache échoue
  }
}

/**
 * Recherche intelligente dans le cache : trouve des résultats pour un budget proche
 * Utile pour éviter les appels API quand on cherche un budget similaire
 * @param maxPrice - Budget recherché
 * @param typeRepas - Type de repas (optionnel)
 * @param allergies - Liste des allergies
 * @param tolerance - Tolérance de prix (ex: 0.1 = 10% de différence acceptée)
 * @returns Les résultats en cache les plus proches ou null
 */
export async function findSimilarCachedSearch(
  maxPrice: number,
  typeRepas?: string,
  allergies: string[] = [],
  tolerance: number = 0.1 // 10% de tolérance par défaut
): Promise<CachedSpoonacularSearchResult[] | null> {
  try {
    const allergiesKey = allergies.sort().join(',');
    const minPrice = maxPrice * (1 - tolerance);
    const maxPriceTolerance = maxPrice * (1 + tolerance);

    // Rechercher dans le cache avec des critères similaires
    const similarCaches = await (prisma as any).spoonacularSearchCache.findMany({
      where: {
        maxPrice: {
          gte: minPrice,
          lte: maxPriceTolerance,
        },
        ...(typeRepas ? { typeRepas } : {}),
        allergies: allergiesKey,
      },
      orderBy: {
        maxPrice: 'asc', // Prendre le plus proche
      },
      take: 1, // Prendre seulement le plus proche
    });

    if (similarCaches.length > 0) {
      const cached = similarCaches[0];
      console.log(`🔍 [Spoonacular Cache] Cache similaire trouvé (budget: ${cached.maxPrice}$ vs ${maxPrice}$)`);
      const results = cached.resultsJson as any as CachedSpoonacularSearchResult[];
      return results;
    }

    return null;
  } catch (error) {
    console.error("❌ [Spoonacular Cache] Erreur lors de la recherche de cache similaire:", error);
    return null;
  }
}

