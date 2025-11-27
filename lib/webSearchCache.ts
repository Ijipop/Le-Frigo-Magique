import { prisma } from "./prisma";

// Durée de cache en millisecondes (null = infini, conservation permanente)
// Le cache s'enrichit progressivement au lieu d'être vidé
const CACHE_DURATION_MS: number | null = null; // null = conservation infinie

export interface CachedResult {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
  servings?: number;
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
      console.log("🔍 [Cache] Aucun cache trouvé pour:", query.substring(0, 100));
      return null;
    }
    
    console.log("✅ [Cache] Cache trouvé pour:", query.substring(0, 100));

    // Vérifier si le cache est expiré (seulement si CACHE_DURATION_MS est défini)
    if (CACHE_DURATION_MS !== null) {
      const cacheAge = Date.now() - cached.updatedAt.getTime();
      if (cacheAge > CACHE_DURATION_MS) {
        // Supprimer le cache expiré
        await prisma.webSearchCache.delete({
          where: { query },
        });
        return null;
      }
    }

    // Parser les résultats JSON
    try {
      const results = JSON.parse(cached.resultsJson) as CachedResult[];
      console.log(`📦 [Cache] ${results.length} résultat(s) parsés depuis le cache`);
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
 * @param merge - Si true, fusionne avec les résultats existants au lieu de remplacer
 */
export async function saveCache(
  query: string,
  results: CachedResult[],
  merge: boolean = false
): Promise<void> {
  try {
    let resultsToSave = results;
    
    // Si merge = true, fusionner avec les résultats existants
    if (merge) {
      const existing = await getCachedResults(query);
      if (existing && existing.length > 0) {
        // Créer un Set des URLs existantes pour éviter les doublons
        const existingUrls = new Set(existing.map(r => r.url));
        
        // Ajouter seulement les nouvelles recettes (pas déjà dans le cache)
        const newResults = results.filter(r => !existingUrls.has(r.url));
        
        // Fusionner : anciennes + nouvelles
        resultsToSave = [...existing, ...newResults];
        
        console.log(`🔄 [Cache] Fusion: ${existing.length} existantes + ${newResults.length} nouvelles = ${resultsToSave.length} total`);
      }
    }
    
    const resultsJson = JSON.stringify(resultsToSave);

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
    
    console.log(`💾 [Cache] ${resultsToSave.length} résultat(s) sauvegardés dans le cache pour:`, query.substring(0, 100));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du cache:", error);
    // Ne pas faire échouer la requête si le cache échoue
  }
}
