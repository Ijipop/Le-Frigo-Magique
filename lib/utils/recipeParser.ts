import { logger } from "./logger";

/**
 * Parse légal d'une recette pour extraire uniquement les ingrédients
 * 
 * PRINCIPES LÉGAUX (Québec/Canada) :
 * 1. Extraction minimale : seulement les ingrédients (données factuelles)
 * 2. Pas de stockage du contenu complet (instructions, texte)
 * 3. Attribution et lien vers la source originale
 * 4. Respect des robots.txt et conditions d'utilisation
 * 5. Utilisation équitable (fair use) pour calcul de coût uniquement
 * 
 * Les ingrédients sont considérés comme des "faits" et non protégés par le droit d'auteur
 * selon la jurisprudence canadienne (CCH Canadian Ltd. v. Law Society of Upper Canada)
 */

interface ParsedIngredients {
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
  }>;
  servings?: number;
  source: string;
}

/**
 * Parse une page de recette pour extraire uniquement les ingrédients
 * 
 * Cette fonction :
 * - Respecte robots.txt
 * - N'extrait que les ingrédients (données factuelles)
 * - Ne stocke pas le contenu complet
 * - Retourne une erreur si le site bloque le scraping
 */
export async function parseRecipeIngredients(
  url: string
): Promise<ParsedIngredients> {
  try {
    // 1. Vérifier robots.txt (respect de la volonté du site)
    const robotsTxtUrl = new URL(url);
    robotsTxtUrl.pathname = "/robots.txt";
    
    try {
      const robotsResponse = await fetch(robotsTxtUrl.toString(), {
        headers: {
          "User-Agent": "FrigoMagique/1.0 (Recipe Cost Calculator)",
        },
      });
      
      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        // Vérifier si notre user-agent est bloqué
        if (robotsText.includes("User-agent: *") && robotsText.includes("Disallow: /")) {
          logger.warn("Site bloque le scraping via robots.txt", { url });
          throw new Error("Site bloque l'accès via robots.txt");
        }
      }
    } catch (error) {
      // Si robots.txt n'existe pas ou est inaccessible, continuer
      logger.debug("robots.txt non accessible, continuation", { url });
    }

    // 2. Faire une requête respectueuse avec User-Agent clair
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "FrigoMagique/1.0 (Recipe Cost Calculator - https://frigomagique.com)",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "fr-CA,fr;q=0.9",
          "Referer": "https://frigomagique.com",
        },
        // Timeout pour éviter les blocages
        signal: AbortSignal.timeout(15000), // 15 secondes max (augmenté pour les sites lents)
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "TimeoutError") {
        throw new Error("Le site a pris trop de temps à répondre (timeout après 15 secondes)");
      }
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error("La requête a été annulée");
      }
      throw new Error(`Erreur réseau: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // 3. Extraire uniquement les ingrédients (données factuelles)
    // Utiliser des sélecteurs CSS communs pour les recettes structurées
    const ingredients = extractIngredientsFromHTML(html, url);

    if (ingredients.length === 0) {
      logger.warn("Aucun ingrédient trouvé dans la recette", { url });
    }

    // 4. Extraire le nombre de portions si disponible
    const servings = extractServings(html);

    return {
      ingredients,
      servings,
      source: url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error(
      "Erreur lors du parsing de la recette",
      error instanceof Error ? error : new Error(errorMessage),
      {
        message: errorMessage,
        stack: errorStack,
        url,
      }
    );
    
    // Si c'est un timeout ou une erreur réseau, relancer avec un message plus clair
    if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
      throw new Error("Le site a pris trop de temps à répondre. Veuillez réessayer.");
    }
    
    // Si c'est une erreur HTTP, relancer avec un message plus clair
    if (errorMessage.includes("HTTP")) {
      throw new Error(`Impossible d'accéder à cette recette: ${errorMessage}`);
    }
    
    throw error;
  }
}

/**
 * Extrait les ingrédients depuis le HTML
 * Utilise plusieurs stratégies pour différents formats de sites
 */
function extractIngredientsFromHTML(
  html: string,
  url: string
): Array<{ name: string; quantity?: string; unit?: string }> {
  const ingredients: Array<{ name: string; quantity?: string; unit?: string }> = [];

  // Stratégie 1 : Schema.org Recipe (format structuré légal)
  // Les sites qui utilisent Schema.org donnent explicitement leur consentement
  // à l'extraction de données structurées
  try {
    const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs);
    if (schemaMatch) {
      for (const match of schemaMatch) {
        try {
          let jsonContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
          // Nettoyer le contenu JSON (enlever les commentaires HTML éventuels)
          jsonContent = jsonContent.trim();
          
          if (!jsonContent || jsonContent.length === 0) {
            continue;
          }
          
          const data = JSON.parse(jsonContent);
          
          // Gérer les arrays et objets simples
          const recipes = Array.isArray(data) ? data : [data];
          
          for (const recipe of recipes) {
            if (recipe["@type"] === "Recipe" || recipe["@type"] === "https://schema.org/Recipe") {
              const recipeIngredients = recipe.recipeIngredient || recipe.ingredients || [];
              
              for (const ingredient of recipeIngredients) {
                if (typeof ingredient === "string") {
                  const parsed = parseIngredientString(ingredient);
                  if (parsed) {
                    ingredients.push(parsed);
                  }
                }
              }
              
              // Si on a trouvé des ingrédients via Schema.org, on s'arrête là (plus légal)
              if (ingredients.length > 0) {
                logger.info("Ingrédients extraits via Schema.org (format structuré légal)", {
                  url,
                  count: ingredients.length,
                });
                return ingredients;
              }
            }
          }
        } catch (e) {
          // JSON invalide, continuer
        }
      }
    }
  } catch (error) {
    // Erreur lors de l'extraction Schema.org, continuer avec d'autres méthodes
  }

  // Stratégie 2 : Sélecteurs CSS communs (seulement si Schema.org n'a pas fonctionné)
  // On cherche des patterns HTML communs pour les listes d'ingrédients
  const selectors = [
    /<li[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>(.*?)<\/li>/gi,
    /<li[^>]*itemprop=["']recipeIngredient["'][^>]*>(.*?)<\/li>/gi,
    /<span[^>]*itemprop=["']recipeIngredient["'][^>]*>(.*?)<\/span>/gi,
  ];

  for (const selector of selectors) {
    const matches = html.matchAll(selector);
    for (const match of matches) {
      const text = cleanHTML(match[1]);
      if (text && text.length > 2) {
        const parsed = parseIngredientString(text);
        if (parsed && !ingredients.some(i => i.name.toLowerCase() === parsed.name.toLowerCase())) {
          ingredients.push(parsed);
        }
      }
    }
    
    if (ingredients.length > 0) {
      break; // On a trouvé des ingrédients, on s'arrête
    }
  }

  return ingredients;
}

/**
 * Parse une chaîne d'ingrédient pour extraire nom, quantité et unité
 * Exemple: "2 tasses de farine" -> { quantity: "2", unit: "tasses", name: "farine" }
 */
function parseIngredientString(
  text: string
): { name: string; quantity?: string; unit?: string } | null {
  // Nettoyer le texte
  text = text.trim().replace(/\s+/g, " ");
  
  if (text.length < 2) {
    return null;
  }

  // Pattern pour détecter quantité + unité + nom
  // Exemples: "2 tasses de farine", "500g de poulet", "1/2 cuillère à soupe d'huile"
  const patterns = [
    /^(\d+\/\d+|\d+\.?\d*)\s+([a-zàâäéèêëïîôùûüÿç]+(?:\s+[a-zàâäéèêëïîôùûüÿç]+)*)\s+(?:de|d'|d")\s+(.+)$/i,
    /^(\d+\/\d+|\d+\.?\d*)\s+([a-zàâäéèêëïîôùûüÿç]+(?:\s+[a-zàâäéèêëïîôùûüÿç]+)*)\s+(.+)$/i,
    /^(\d+\/\d+|\d+\.?\d*)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Format: quantité + unité + "de" + nom
        return {
          quantity: match[1],
          unit: match[2],
          name: match[3].trim(),
        };
      } else if (match.length === 3) {
        // Format: quantité + nom (ou quantité + unité + nom sans "de")
        // Essayer de détecter si le deuxième groupe est une unité
        const possibleUnit = match[2].toLowerCase();
        const commonUnits = [
          "tasse", "tasses", "cuillère", "cuillères", "c. à soupe", "c. à thé",
          "g", "kg", "ml", "l", "oz", "lb", "livre", "livres",
          "tranche", "tranches", "gousse", "gousses", "tête", "têtes",
        ];
        
        if (commonUnits.some(u => possibleUnit.includes(u))) {
          // C'est probablement une unité, chercher le nom après
          const rest = text.substring(match[0].length).trim();
          if (rest) {
            return {
              quantity: match[1],
              unit: match[2],
              name: rest,
            };
          }
        }
        
        // Sinon, c'est probablement juste quantité + nom
        return {
          quantity: match[1],
          name: match[2].trim(),
        };
      }
    }
  }

  // Si aucun pattern ne correspond, retourner tout comme nom
  return {
    name: text,
  };
}

/**
 * Nettoie le HTML pour extraire le texte
 */
function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ") // Supprimer les balises HTML
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Extrait le nombre de portions depuis le HTML
 */
function extractServings(html: string): number | undefined {
  // Chercher dans Schema.org
  try {
    const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gs);
    if (schemaMatch) {
      for (const match of schemaMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
          const data = JSON.parse(jsonContent);
          const recipes = Array.isArray(data) ? data : [data];
          
          for (const recipe of recipes) {
            if (recipe["@type"] === "Recipe" || recipe["@type"] === "https://schema.org/Recipe") {
              const recipeYield = recipe.recipeYield || recipe.yield;
              if (recipeYield) {
                const servings = typeof recipeYield === "string" 
                  ? parseInt(recipeYield.match(/\d+/)?.[0] || "0")
                  : parseInt(String(recipeYield));
                if (servings > 0) {
                  return servings;
                }
              }
            }
          }
        } catch (e) {
          // Continuer
        }
      }
    }
  } catch (error) {
    // Continuer
  }

  // Chercher dans le texte avec des patterns
  const patterns = [
    /(\d+)\s+(?:portion|portions|personne|personnes|serving|servings)/i,
    /pour\s+(\d+)\s+(?:personne|personnes|portion|portions)/i,
    /serves?\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const servings = parseInt(match[1]);
      if (servings > 0) {
        return servings;
      }
    }
  }

  return undefined;
}

