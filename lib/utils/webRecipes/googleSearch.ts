/**
 * Recherche Google pour les recettes
 */

import { logger } from "../logger";
import { extractServingsFromText } from "../recipeParser";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

export interface GoogleSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  image?: string | null;
  servings?: number | undefined;
}

/**
 * Effectue une recherche Google pour des recettes avec pagination et extraction des servings
 */
export async function performGoogleSearch(
  query: string,
  maxResults: number = 10
): Promise<GoogleSearchResult[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    logger.error("GOOGLE_API_KEY ou GOOGLE_CX manquants");
    return [];
  }

  try {
    const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
    url.searchParams.set("key", GOOGLE_API_KEY);
    url.searchParams.set("cx", GOOGLE_CX);
    url.searchParams.set("q", query);
    url.searchParams.set("num", Math.min(maxResults, 10).toString()); // Google limite à 10 par requête
    url.searchParams.set("lr", "lang_fr"); // Limiter aux résultats en français
    url.searchParams.set("hl", "fr"); // Interface en français

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      // Timeout pour Vercel Hobby (10s max)
      signal: AbortSignal.timeout(8000), // 8s pour laisser de la marge
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(errorText);
      logger.error(`Erreur Google API: ${response.status}`, error, { query });
      return [];
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    let items = data.items;

    // Si on veut plus de 10 résultats, faire une deuxième requête avec start=11
    if (maxResults > 10 && items.length === 10) {
      const url2 = new URL("https://customsearch.googleapis.com/customsearch/v1");
      url2.searchParams.set("key", GOOGLE_API_KEY);
      url2.searchParams.set("cx", GOOGLE_CX);
      url2.searchParams.set("q", query);
      url2.searchParams.set("num", Math.min(maxResults - 10, 10).toString());
      url2.searchParams.set("start", "11");
      url2.searchParams.set("lr", "lang_fr");
      url2.searchParams.set("hl", "fr");

      try {
        const response2 = await fetch(url2.toString(), {
          headers: {
            "Accept": "application/json",
          },
          signal: AbortSignal.timeout(8000),
        });
        const data2 = await response2.json();
        if (response2.ok && !data2.error && data2.items) {
          items.push(...data2.items);
        }
      } catch (e) {
        logger.warn("Erreur lors de la deuxième requête Google", {
          error: e instanceof Error ? e.message : String(e),
          query,
        });
      }
    }

    return items.map((item: any) => {
      // Extraire le nombre de portions depuis le titre et snippet
      const fullText = `${item.title || ""} ${item.snippet || ""}`;
      const servings = extractServingsFromText(fullText);

      return {
        title: item.title || "",
        url: item.link || "",
        image:
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src ||
          null,
        snippet: item.snippet || "",
        source: item.displayLink || undefined,
        servings: servings || undefined, // undefined si non trouvé
      };
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      logger.warn("Timeout lors de la recherche Google", { query });
      return [];
    }
    logger.error(
      "Erreur lors de la recherche Google",
      error instanceof Error ? error : new Error(String(error)),
      { query }
    );
    return [];
  }
}

