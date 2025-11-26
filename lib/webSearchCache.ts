import { prisma } from "./prisma";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures

export interface CachedResult {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
}

/**
 * Récupère les résultats en cache pour une requête donnée
 * @param query - La requête de recherche
 * @returns Les résultats en cache ou null si le cache est expiré/inexistant
 */
export async function getCachedResults(
  query: string
): Promise<CachedResult[] | null> {
  try {
    const cached = await prisma.webSearchCache.findUnique({
      where: { query },
    });

    if (!cached) {
      return null;
    }

    // Vérifier si le cache est expiré
    const cacheAge = Date.now() - cached.updatedAt.getTime();
    if (cacheAge > CACHE_DURATION_MS) {
      // Supprimer le cache expiré
      await prisma.webSearchCache.delete({
        where: { query },
      });
      return null;
    }

    // Parser les résultats JSON
    try {
      const results = JSON.parse(cached.resultsJson) as CachedResult[];
      return results;
    } catch (error) {
      console.error("Erreur lors du parsing du cache:", error);
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du cache:", error);
    return null;
  }
}

/**
 * Sauvegarde les résultats dans le cache
 * @param query - La requête de recherche
 * @param results - Les résultats à mettre en cache
 */
export async function saveCache(
  query: string,
  results: CachedResult[]
): Promise<void> {
  try {
    const resultsJson = JSON.stringify(results);

    await prisma.webSearchCache.upsert({
      where: { query },
      update: {
        resultsJson,
        updatedAt: new Date(),
      },
      create: {
        query,
        resultsJson,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du cache:", error);
    // Ne pas faire échouer la requête si le cache échoue
  }
}
