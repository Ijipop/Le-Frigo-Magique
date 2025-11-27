import { NextResponse } from "next/server";
import { getCachedResults, saveCache } from "../../../../lib/webSearchCache";
import { withRateLimit, RateLimitConfigs } from "../../../../lib/utils/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { logger } from "../../../../lib/utils/logger";
import { extractServingsFromText } from "../../../../lib/utils/servingsExtractor";

export const GET = withRateLimit(
  RateLimitConfigs.SEARCH, // 10 requêtes par minute
  async (req: Request) => {
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);

    const ingredientsParam = searchParams.get("ingredients") || "";
    const budgetParam = searchParams.get("budget") || "";
    const allergiesParam = searchParams.get("allergies") || "";
    const filtersParam = searchParams.get("filters") || "";
    const typeRepasParam = searchParams.get("typeRepas") || "";
    const jourSemaineParam = searchParams.get("jourSemaine") || "";

    // Récupérer le code postal et les préférences de recherche budget de l'utilisateur
    let postalCode: string | undefined;
    let typeRepas: string | undefined = typeRepasParam || undefined;
    let jourSemaine: number | undefined = jourSemaineParam ? parseInt(jourSemaineParam) : undefined;
    
    if (userId) {
      try {
        const utilisateur = await getOrCreateUser(userId);
        if (utilisateur) {
          const preferences = await prisma.preferences.findUnique({
            where: { utilisateurId: utilisateur.id },
          });
          postalCode = preferences?.codePostal || undefined;
          
          // Utiliser les valeurs de la DB si pas fournies en paramètre
          if (!typeRepas && utilisateur.typeRepasBudget) {
            typeRepas = utilisateur.typeRepasBudget;
          }
          if (!jourSemaine && utilisateur.jourSemaineBudget) {
            jourSemaine = utilisateur.jourSemaineBudget;
          }
        }
      } catch (error) {
        logger.warn("Erreur lors de la récupération des préférences utilisateur", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Normaliser les ingrédients (minuscules, trim, déduplication)
    const ingredientsArray = ingredientsParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index); // Déduplication

    // Normaliser les allergies (minuscules, trim, déduplication)
    const allergiesArray = allergiesParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index); // Déduplication

    // Normaliser les filtres (minuscules, trim, déduplication)
    const filtersArray = filtersParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index); // Déduplication

    // Trier pour une clé de cache cohérente (indépendante de l'ordre)
    const normalizedIngredients = ingredientsArray.sort().join(",");
    const normalizedAllergies = allergiesArray.sort().join(",");
    const normalizedFilters = filtersArray.sort().join(",");
    
    // Construire la clé de cache normalisée (incluant les allergies et filtres)
    const cacheKey = `ingredients:${normalizedIngredients}-budget:${budgetParam}-allergies:${normalizedAllergies}-filters:${normalizedFilters}`;
    
    console.log("🔑 [API] Clé de cache:", cacheKey);
    console.log("🔑 [API] Ingrédients reçus:", ingredientsParam);
    console.log("🔑 [API] Ingrédients normalisés:", normalizedIngredients);
    console.log("🔑 [API] Filtres reçus:", filtersArray);

    // 1️⃣ — Vérifier le cache (conservation infinie)
    console.log("🔍 [API] Vérification du cache...");
    const cached = await getCachedResults(cacheKey);
    if (cached && cached.length > 0) {
      console.log(`✅ [API] ${cached.length} résultat(s) récupérés du cache - AUCUN appel Google nécessaire`);
      return NextResponse.json({ items: cached, cached: true });
    }
    console.log("❌ [API] Cache non trouvé - Appel à Google nécessaire");

    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
      console.error("❌ GOOGLE_API_KEY ou GOOGLE_CX manquants");
      return NextResponse.json(
        { items: [], error: "missing_env" },
        { status: 500 }
      );
    }

    // 2️⃣ — Construire la requête Google de manière optimale
    // Stratégie : utiliser seulement 2-3 ingrédients principaux pour maximiser les résultats
    // Plus on a d'ingrédients dans la requête, plus Google devient restrictif
    // On va faire plusieurs recherches avec différents ingrédients et combiner les résultats
    
    const allItems: any[] = [];
    const seenUrls = new Set<string>();
    
    // Fonction pour faire une recherche Google
    const performGoogleSearch = async (query: string): Promise<any[]> => {
      const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
      url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
      url.searchParams.set("cx", process.env.GOOGLE_CX!);
      url.searchParams.set("q", query);
      url.searchParams.set("num", "10");

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok || (data as any).error) {
        console.error("❌ [API] Erreur Google pour:", query, (data as any).error);
        return [];
      }

      return (data as any).items?.map((item: any) => {
        // Extraire le nombre de portions depuis le titre et snippet
        const fullText = `${item.title || ""} ${item.snippet || ""}`;
        const servings = extractServingsFromText(fullText);
        
        return {
          title: item.title,
          url: item.link,
          image:
            item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src ||
            null,
          snippet: item.snippet,
          source: item.displayLink,
          servings: servings || undefined,
        };
      }) ?? [];
    };

    // Mapper les filtres vers des termes de recherche Google (normalisé en minuscules)
    const filterTerms: { [key: string]: string } = {
      "proteine": "riche en protéines",
      "dessert": "dessert",
      "smoothie": "smoothie",
      "soupe": "soupe",
      "salade": "salade",
      "petit-dejeuner": "petit-déjeuner",
      "dejeuner": "déjeuner",
      "diner": "dîner",
      "souper": "souper",
      "collation": "collation",
      "pates": "pâtes",
      "pizza": "pizza",
      "grille": "au grill",
      "vegetarien": "végétarien",
      "vegan": "végétalien",
      "sans-gluten": "sans gluten",
      "keto": "keto",
      "paleo": "paléo",
      "halal": "halal",
      "casher": "casher",
      "pescetarien": "pescétarien",
      "rapide": "rapide moins de 30 minutes",
      "economique": "économique pas cher",
      "sante": "santé",
      "comfort": "réconfort",
      "facile": "facile simple",
      "gourmet": "gourmet raffiné",
      "sans-cuisson": "sans cuisson cru",
    };

    // Ajouter le type de repas dans les filtres si fourni
    if (typeRepas && filterTerms[typeRepas]) {
      filtersArray.push(typeRepas);
    }
    
    // Les filtres sont déjà normalisés en minuscules, donc on peut les utiliser directement

    // Construire les termes de filtres pour la requête
    const filterQueryTerms = filtersArray
      .map(filterId => filterTerms[filterId])
      .filter(Boolean)
      .join(" ");

      if (ingredientsArray.length > 0) {
        // Stratégie 1 : Recherche avec les 2-3 premiers ingrédients (priorité aux aliments préférés)
        const nombreIngredients = Math.min(ingredientsArray.length, 3);
        const ingredientsPrincipaux = ingredientsArray.slice(0, nombreIngredients);
        let q1 = `recette ${ingredientsPrincipaux.join(" ")}`;
        
        // Exclure explicitement les pages de listes dans la requête Google
        q1 += " -\"10 recettes\" -\"20 recettes\" -\"5 recettes\" -\"liste de\" -\"top 10\" -\"meilleures recettes\"";
        
        if (budgetParam) {
          q1 += " économique pas cher";
        }
        if (filterQueryTerms) {
          q1 += ` ${filterQueryTerms}`;
        }
      
      console.log("🔎 [API] Recherche principale:", q1);
      const results1 = await performGoogleSearch(q1);
      results1.forEach(item => {
        if (!seenUrls.has(item.url)) {
          allItems.push(item);
          seenUrls.add(item.url);
        }
      });
      console.log(`✅ [API] Recherche principale: ${results1.length} résultat(s), ${allItems.length} unique(s)`);

      // Stratégie 2 : Si on a plus de 3 ingrédients, faire une recherche avec d'autres ingrédients
      if (ingredientsArray.length > 3) {
        const autresIngredients = ingredientsArray.slice(3, 6); // Prendre les 3 suivants
        if (autresIngredients.length > 0) {
          let q2 = `recette ${autresIngredients.join(" ")}`;
          
          // Exclure explicitement les pages de listes dans la requête Google
          q2 += " -\"10 recettes\" -\"20 recettes\" -\"5 recettes\" -\"liste de\" -\"top 10\" -\"meilleures recettes\"";
          
          if (budgetParam) {
            q2 += " économique pas cher";
          }
          if (filterQueryTerms) {
            q2 += ` ${filterQueryTerms}`;
          }
          
          console.log("🔎 [API] Recherche secondaire:", q2);
          const results2 = await performGoogleSearch(q2);
          results2.forEach(item => {
            if (!seenUrls.has(item.url)) {
              allItems.push(item);
              seenUrls.add(item.url);
            }
          });
          console.log(`✅ [API] Recherche secondaire: ${results2.length} résultat(s), ${allItems.length} unique(s) total`);
        }
      }
    } else {
      // Si pas d'ingrédients, recherche générique avec filtres
      let q = "recette";
      
      // Exclure explicitement les pages de listes dans la requête Google
      q += " -\"10 recettes\" -\"20 recettes\" -\"5 recettes\" -\"liste de\" -\"top 10\" -\"meilleures recettes\" -\"repas à rabais\"";
      
      if (filterQueryTerms) {
        q += ` ${filterQueryTerms}`;
      } else {
        q += " québécoise";
      }
      if (budgetParam) {
        q += " économique pas cher";
      }
      console.log("🔎 [API] Recherche générique (sans ingrédients):", q);
      const results = await performGoogleSearch(q);
      allItems.push(...results);
      console.log(`✅ [API] Recherche générique: ${results.length} résultat(s)`);
    }

    console.log(`📊 [API] ${ingredientsArray.length} ingrédient(s) total, ${allItems.length} recette(s) unique(s) trouvée(s)`);

    // Filtrer les sites indésirables (sites qui suggèrent plusieurs recettes à petit prix)
    const blockedDomains = [
      "pinterest.com",
      "pinterest.ca",
      "allrecipes.com",
      "food.com",
      "tasty.co",
      "delish.com",
      "thespruceeats.com",
      "simplyrecipes.com",
      "foodnetwork.com",
      "myrecipes.com",
      "eatingwell.com",
      "bonappetit.com",
      "epicurious.com",
      "seriouseats.com",
      "tasteofhome.com",
      "bettycrocker.com",
      "pillsbury.com",
      "kraftrecipes.com",
      "cookpad.com",
      "yummly.com",
    ];
    
    /**
     * Fonction robuste pour détecter les pages de listes (pas des recettes individuelles)
     */
    const isListPage = (item: any): boolean => {
      if (!item.title && !item.snippet) return false;
      
      const titleLower = (item.title || "").toLowerCase();
      const snippetLower = (item.snippet || "").toLowerCase();
      const fullText = `${titleLower} ${snippetLower}`;
      
      // 1. Détecter les nombres suivis de "recettes", "repas", "idées", etc.
      // Exemples: "5 recettes facile", "20 repas à la mijoteuse", "10 idées"
      const numberListPatterns = [
        /\b(\d+)\s+(recettes?|repas|idées?|astuces?|conseils?|trucs?|plats?|menus?)\b/i,
        /\b(\d+)\s+(recettes?|repas|idées?)\s+(facile|rapide|économique|à\s+rabais|à\s+prix\s+réduit)/i,
        /\b(\d+)\s+(recettes?|repas)\s+(pour|de|avec)/i,
      ];
      
      if (numberListPatterns.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 2. Détecter les patterns de listes avec mots-clés
      const listKeywords = [
        // Patterns avec "meilleures", "top", "liste"
        /\b(meilleures?|top|liste|sélection|collection)\s+(de\s+)?(\d+\s+)?(recettes?|repas|idées?|plats?)/i,
        /\b(top|meilleures?)\s+(\d+)\s+(recettes?|repas|idées?)/i,
        
        // Patterns avec "recettes" + adjectifs de liste
        /recettes?\s+(à\s+)?(petits?\s+prix|économiques?|pas\s+cher|budget|faciles?|rapides?)/i,
        /recettes?\s+(de|pour)\s+(la\s+)?(semaine|mois|famille)/i,
        
        // Patterns avec "repas" + nombre ou adjectifs
        /(\d+\s+)?repas\s+(à\s+)?(rabais|prix\s+réduit|économique|facile|rapide)/i,
        /repas\s+(de|pour)\s+(la\s+)?(semaine|mois)/i,
        
        // Patterns avec "mijoteuse" + nombre
        /(\d+)\s+(recettes?|repas)\s+(à\s+la\s+)?mijoteuse/i,
        /mijoteuse\s*:?\s*(\d+)\s+(recettes?|repas|idées?)/i,
        
        // Patterns avec "astuces", "conseils", "trucs"
        /\b(astuces?|conseils?|trucs?)\s+(pour|de|sur)\s+(bien\s+manger|économiser|cuisiner)/i,
        /\b(\d+)\s+(astuces?|conseils?|trucs?)\s+(pour|de)/i,
        
        // Patterns généraux de listes
        /bien\s+manger\s+sans\s+trop\s+dépenser/i,
        /(\d+)\s+(façons|manières)\s+(de|pour)/i,
        
        // Patterns avec "à rabais", "à prix réduit"
        /(\d+)\s+(recettes?|repas)\s+à\s+(rabais|prix\s+réduit)/i,
        /recettes?\s+à\s+(rabais|prix\s+réduit)/i,
        
        // Patterns avec "facile", "rapide" + nombre
        /(\d+)\s+(recettes?|repas)\s+(facile|rapide|simple)/i,
        
        // Patterns avec "pour" + nombre + "personnes" (souvent des listes)
        /(\d+)\s+(recettes?|repas|idées?)\s+pour\s+(\d+)\s+personnes/i,
      ];
      
      if (listKeywords.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 3. Détecter les titres qui commencent par un nombre (souvent des listes)
      // Exemples: "5 recettes...", "20 repas..."
      if (/^\d+\s+(recettes?|repas|idées?|astuces?|conseils?)/i.test(titleLower)) {
        return true;
      }
      
      // 4. Détecter les patterns avec ":" suivi d'un nombre (ex: "Recettes: 10 idées")
      if (/:\s*(\d+)\s+(recettes?|repas|idées?)/i.test(fullText)) {
        return true;
      }
      
      // 5. Détecter les snippets qui mentionnent explicitement plusieurs recettes
      if (snippetLower.match(/\b(\d+)\s+(recettes?|repas|idées?)\b/)) {
        // Mais seulement si c'est au début ou si c'est clairement une liste
        if (snippetLower.match(/^(découvrez|voici|consultez)\s+(\d+)\s+(recettes?|repas|idées?)/i)) {
          return true;
        }
      }
      
      return false;
    };
    
    const filteredByDomain = allItems.filter(item => {
      if (!item.source) return true;
      const domain = item.source.toLowerCase();
      
      // Exclure les domaines bloqués
      const isBlocked = blockedDomains.some(blocked => domain.includes(blocked));
      
      // Exclure les pages de listes
      const isList = isListPage(item);
      
      return !isBlocked && !isList;
    });
    
    console.log(`🚫 [API] ${allItems.length - filteredByDomain.length} recette(s) filtrée(s) (sites indésirables/listes)`);

    // Filtrer les recettes contenant des allergènes
    let filteredItems = filteredByDomain;
    if (allergiesArray.length > 0) {
      // Mapper les IDs d'allergies aux termes de recherche
      const allergyTerms: { [key: string]: string[] } = {
        "gluten": ["gluten", "blé", "farine", "pain", "pâtes"],
        "lactose": ["lait", "lactose", "fromage", "beurre", "crème", "yaourt"],
        "arachides": ["arachide", "cacahuète", "peanut"],
        "noix": ["noix", "noisette", "amande", "pistache", "noix de cajou"],
        "soja": ["soja", "soya", "tofu"],
        "poisson": ["poisson", "saumon", "thon", "morue"],
        "crustaces": ["crevette", "crabe", "homard", "langouste"],
        "oeufs": ["œuf", "oeuf", "egg"],
        "fruits-de-mer": ["fruits de mer", "coquillage", "moule", "huître"],
        "sulfites": ["sulfite"],
        "sesame": ["sésame", "sesame", "tahini"],
        "moutarde": ["moutarde"],
      };

      const searchTerms: string[] = [];
      allergiesArray.forEach(allergyId => {
        const terms = allergyTerms[allergyId] || [allergyId.toLowerCase()];
        searchTerms.push(...terms);
      });

      console.log(`🚫 [API] Filtrage des recettes contenant: ${searchTerms.join(", ")}`);
      
      filteredItems = allItems.filter(item => {
        const titleLower = item.title.toLowerCase();
        const snippetLower = (item.snippet || "").toLowerCase();
        const textToSearch = `${titleLower} ${snippetLower}`;
        
        // Exclure si la recette contient un terme d'allergie
        const containsAllergy = searchTerms.some(term => 
          textToSearch.includes(term.toLowerCase())
        );
        
        return !containsAllergy;
      });

      console.log(`✅ [API] ${filteredItems.length} recette(s) après filtrage des allergies (${allItems.length - filteredItems.length} exclue(s))`);
    }

    // Limiter à 20 résultats maximum pour éviter une réponse trop lourde
    let items = filteredItems.slice(0, 20);

    // 4️⃣ — Estimer le coût de chaque recette (approche rapide avec GPT ou règles)
    // Utilise l'estimation rapide qui analyse titre + snippet sans lire toute la recette
    const budget = budgetParam ? parseFloat(budgetParam) : null;
    
    // Importer les fonctions d'estimation
    const { estimateRecipeCost } = await import("../../../../lib/utils/recipeCostEstimator");
    
    logger.info("Estimation rapide des coûts des recettes", {
      budget,
      nombreRecettes: items.length,
      method: process.env.OPENAI_API_KEY ? "gpt" : "rules",
    });

    // Estimer les coûts en parallèle (batch pour performance)
    const itemsWithCost = await Promise.all(
      items.map(async (item) => {
        try {
          const result = await estimateRecipeCost(item.title, item.snippet || "");
          return {
            ...item,
            estimatedCost: result.estimatedCost,
            costSource: result.source, // "gpt" ou "rules"
          };
        } catch (error) {
          logger.warn("Erreur lors de l'estimation du coût d'une recette", {
            error: error instanceof Error ? error.message : String(error),
            title: item.title,
          });
          return {
            ...item,
            estimatedCost: 10.00, // Prix moyen par défaut
            costSource: "fallback",
          };
        }
      })
    );

    // Filtrer par budget si nécessaire
    if (budget && budget > 0) {
      items = itemsWithCost
        .filter((item) => {
          if (item.estimatedCost === null) {
            // Si on n'a pas pu estimer le coût, on garde la recette (fallback)
            return true;
          }
          return item.estimatedCost <= budget;
        })
        .sort((a, b) => {
          // Trier par coût croissant (moins cher en premier)
          const costA = a.estimatedCost ?? Infinity;
          const costB = b.estimatedCost ?? Infinity;
          return costA - costB;
        });

      logger.info("Recettes filtrées par budget", {
        budget,
        recettesAvant: itemsWithCost.length,
        recettesApres: items.length,
      });
    } else {
      items = itemsWithCost;
    }

    // 3️⃣ — Sauvegarder dans le cache (conservation infinie)
    // Note: On ne cache pas les coûts car ils peuvent changer
    const itemsForCache = items.map(({ estimatedCost, ingredients, ...item }) => item);
    if (itemsForCache.length > 0) {
      await saveCache(cacheKey, itemsForCache);
      console.log("💾 [API] Résultats sauvegardés dans le cache (conservation infinie)");
    }

    return NextResponse.json({ items, cached: false });
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);
