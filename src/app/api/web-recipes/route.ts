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
          postalCode = (preferences as any)?.codePostal || undefined;
          
          // Utiliser les valeurs de la DB si pas fournies en paramètre
          if (!typeRepas && (utilisateur as any).typeRepasBudget) {
            typeRepas = (utilisateur as any).typeRepasBudget;
          }
          if (!jourSemaine && (utilisateur as any).jourSemaineBudget) {
            jourSemaine = (utilisateur as any).jourSemaineBudget;
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

    // 1️⃣ — Vérifier le cache (conservation infinie avec enrichissement progressif)
    // STRATÉGIE OPTIMISÉE :
    // - Si cache suffisant (≥20 recettes après filtrage) → Utiliser le cache avec mélange aléatoire
    // - Si cache insuffisant → Recherche Google + Fusion avec le cache existant (enrichissement)
    // - Le cache s'enrichit progressivement au lieu d'être vidé
    console.log("🔍 [API] Vérification du cache...");
    const cached = await getCachedResults(cacheKey);
    const MIN_CACHE_RECIPES = 20; // Minimum de recettes après filtrage pour utiliser uniquement le cache
    
    if (cached && cached.length >= MIN_CACHE_RECIPES) {
      console.log(`✅ [API] Cache valide trouvé (${cached.length} recettes) - Utilisation du cache avec mélange aléatoire`);
      
      // IMPORTANT : Filtrer les résultats du cache aussi !
      // Définir les fonctions de filtrage AVANT de les utiliser
      const blockedDomains = [
        "pinterest.com", "pinterest.ca", "allrecipes.com", "food.com", "tasty.co",
        "delish.com", "thespruceeats.com", "simplyrecipes.com", "foodnetwork.com",
        "myrecipes.com", "eatingwell.com", "bonappetit.com", "epicurious.com",
        "seriouseats.com", "tasteofhome.com", "bettycrocker.com", "pillsbury.com",
        "kraftrecipes.com", "cookpad.com", "yummly.com",
        "recettes.qc.ca", "lesgourmandisesdisa.com", "5ingredients15minutes.com",
      ];
      
      // Fonction de détection de listes (copie de celle définie plus bas)
      const isListPage = (item: any): boolean => {
        if (!item.title && !item.snippet) return false;
        const titleLower = (item.title || "").toLowerCase();
        const snippetLower = (item.snippet || "").toLowerCase();
        const fullText = `${titleLower} ${snippetLower}`;
        
        // Patterns de détection (version simplifiée mais efficace)
        if (/\b(\d+)\s+(recettes?|repas|idées?|astuces?|conseils?|trucs?|plats?|menus?|suggestions?)\b/i.test(fullText)) return true;
        if (/\b(projet|expérience|expérience\s+culinaire|commerce|fait\s+maison|lequel|comparaison)\b/i.test(fullText)) return true;
        if (/(petits?\s+prix|cuisine\s+de\s+groupe|restes|recettes?\s+du\s+québec)/i.test(fullText)) return true;
        if (titleLower.includes("|") && /(petits?\s+prix|cuisine\s+de\s+groupe|restes|recettes?\s+du\s+québec)/i.test(titleLower)) return true;
        if (/^(du|le|la|quel|quelle|lequel)\s+(commerce|fait\s+maison|revient|coûte)/i.test(titleLower)) return true;
        if (/(apprendre|planifier|adapter)\s+(les?\s+)?(portions|recettes?|repas)/i.test(snippetLower)) return true;
        if (item.url && /recettes\.qc\.ca|lesgourmandisesdisa\.com|5ingredients15minutes\.com/i.test(item.url)) return true;
        return false;
      };
      
      // Filtrer les résultats du cache
      const filteredCached = cached.filter(item => {
        if (!item.source) return true;
        const domain = item.source.toLowerCase();
        const isBlocked = blockedDomains.some(blocked => domain.includes(blocked));
        const isList = isListPage(item);
        return !isBlocked && !isList;
      });
      
      console.log(`🚫 [API] Cache: ${cached.length} → ${filteredCached.length} après filtrage`);
      
      // Si après filtrage on a encore assez de recettes, utiliser le cache avec mélange aléatoire
      if (filteredCached.length >= MIN_CACHE_RECIPES) {
        // Mélanger aléatoirement pour offrir de la variété à chaque requête
        const shuffled = [...filteredCached].sort(() => Math.random() - 0.5);
        
        // Estimer les coûts pour les résultats du cache filtrés
        const { estimateRecipeCost } = await import("../../../../lib/utils/recipeCostEstimator");
        const cachedWithCost = await Promise.all(
          shuffled.map(async (item: any) => {
            try {
              const result = await estimateRecipeCost(item.title, item.snippet || "");
              
              // Ré-extraire les portions si nécessaire
              let servings = item.servings;
              if (!servings || servings === undefined) {
                const fullText = `${item.title || ""} ${item.snippet || ""}`;
                servings = extractServingsFromText(fullText) || undefined;
              }
              
              return {
                ...item,
                estimatedCost: result.estimatedCost,
                costSource: result.source,
                servings: servings,
              };
            } catch (error) {
              return {
                ...item,
                estimatedCost: 10.00,
                costSource: "fallback",
                servings: item.servings || undefined,
              };
            }
          })
        );
        
        // Sélectionner aléatoirement entre 10 et 15 recettes pour variété
        const minReturn = 10;
        const maxReturn = 15;
        const count = Math.min(maxReturn, cachedWithCost.length);
        const selected = cachedWithCost.slice(0, count);
        
        console.log(`🎲 [API] ${selected.length} recette(s) sélectionnée(s) aléatoirement depuis le cache`);
        return NextResponse.json({ items: selected, cached: true });
      } else {
        console.log(`⚠️ [API] Cache insuffisant après filtrage (${filteredCached.length} < ${MIN_CACHE_RECIPES}), nouvelle recherche nécessaire`);
        // Continuer avec une nouvelle recherche Google
      }
    } else if (cached && cached.length > 0 && cached.length < MIN_CACHE_RECIPES) {
      console.log(`⚠️ [API] Cache trouvé mais insuffisant (${cached.length} < ${MIN_CACHE_RECIPES}), nouvelle recherche pour plus de variété`);
      // Continuer avec une nouvelle recherche Google
      // IMPORTANT : Si le cache a très peu de résultats (moins de 5), on va faire une recherche complète
      // et enrichir le cache avec les nouveaux résultats
    } else {
      console.log("❌ [API] Cache non trouvé ou expiré - Nouvelle recherche Google");
    }
    
    // Si on a un cache avec très peu de résultats (moins de 5), on peut les ajouter aux résultats initiaux
    // mais on va quand même faire une nouvelle recherche pour enrichir
    if (cached && cached.length > 0 && cached.length < 5 && ingredientsArray.length > 0) {
      console.log(`📦 [API] Cache avec seulement ${cached.length} résultat(s) - Ajout aux résultats initiaux et recherche complète`);
      // Ajouter les résultats du cache aux allItems pour ne pas les perdre
      cached.forEach((item: any) => {
        if (!seenUrls.has(item.url)) {
          allItems.push(item);
          seenUrls.add(item.url);
        }
      });
    }

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
    
    // Fonction pour faire une recherche Google - optimisée pour les recettes individuelles
    const performGoogleSearch = async (query: string, maxResults: number = 20): Promise<any[]> => {
      const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
      url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
      url.searchParams.set("cx", process.env.GOOGLE_CX!);
      url.searchParams.set("q", query);
      url.searchParams.set("num", Math.min(maxResults, 10).toString()); // Google limite à 10 par requête
      url.searchParams.set("lr", "lang_fr"); // Limiter aux résultats en français
      url.searchParams.set("hl", "fr"); // Interface en français

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok || (data as any).error) {
        console.error("❌ [API] Erreur Google pour:", query, (data as any).error);
        return [];
      }

      const items = (data as any).items || [];
      
      // Si on veut plus de 10 résultats, faire une deuxième requête avec start=11
      if (maxResults > 10 && items.length === 10) {
        const url2 = new URL("https://customsearch.googleapis.com/customsearch/v1");
        url2.searchParams.set("key", process.env.GOOGLE_API_KEY!);
        url2.searchParams.set("cx", process.env.GOOGLE_CX!);
        url2.searchParams.set("q", query);
        url2.searchParams.set("num", Math.min(maxResults - 10, 10).toString());
        url2.searchParams.set("start", "11");
        url2.searchParams.set("lr", "lang_fr"); // Limiter aux résultats en français
        url2.searchParams.set("hl", "fr"); // Interface en français
        
        try {
          const res2 = await fetch(url2.toString());
          const data2 = await res2.json();
          if (res2.ok && !(data2 as any).error && (data2 as any).items) {
            items.push(...(data2 as any).items);
          }
        } catch (e) {
          console.warn("⚠️ [API] Erreur lors de la deuxième requête Google:", e);
        }
      }

      return items.map((item: any) => {
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
          servings: servings || undefined, // undefined si non trouvé
        };
      });
    };

    // Mapper les filtres vers des termes de recherche Google (normalisé en minuscules)
    // Ces termes sont utilisés dans la requête Google pour trouver les recettes
    const filterTerms: { [key: string]: string } = {
      "proteine": "riche en protéines high protein",
      "dessert": "dessert gâteau cake",
      "smoothie": "smoothie",
      "soupe": "soupe soup potage",
      "salade": "salade salad",
      "petit-dejeuner": "petit-déjeuner breakfast",
      "dejeuner": "déjeuner lunch",
      "diner": "dîner dinner",
      "souper": "souper supper",
      "collation": "collation snack",
      "pates": "pâtes pasta",
      "pizza": "pizza",
      "grille": "grill grillé barbecue bbq",
      "vegetarien": "végétarien vegetarian",
      "vegan": "végétalien vegan",
      "sans-gluten": "sans gluten gluten-free",
      "keto": "keto cétogène ketogenic low carb",
      "paleo": "paléo paleo",
      "halal": "halal",
      "casher": "casher kosher",
      "pescetarien": "pescétarien pescatarian",
      "rapide": "rapide quick moins de 30 minutes",
      "economique": "économique pas cher budget",
      "sante": "santé healthy",
      "comfort": "réconfort comfort food",
      "facile": "facile easy simple",
      "gourmet": "gourmet raffiné",
      "sans-cuisson": "sans cuisson no cook raw",
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

    // Stratégie optimisée : Recherche ciblée pour des RECETTES INDIVIDUELLES uniquement
    // On cherche spécifiquement des recettes, pas des listes
    let query = "";
    
    if (ingredientsArray.length > 0) {
      // Utiliser les 2-3 premiers ingrédients pour une recherche plus précise
      // Si on a beaucoup d'ingrédients (5+), utiliser seulement 2 pour avoir plus de résultats
      const nombreIngredients = ingredientsArray.length >= 5 ? 2 : Math.min(ingredientsArray.length, 3);
      const ingredientsPrincipaux = ingredientsArray.slice(0, nombreIngredients);
      
      // Si on a aussi des filtres, rendre la requête moins restrictive pour avoir plus de résultats
      if (filterQueryTerms) {
        // Avec ingrédients + filtres : requête plus flexible
        query = `recette ${ingredientsPrincipaux.join(" ")} ${filterQueryTerms}`;
      } else {
        // Avec ingrédients seulement : requête flexible (sans guillemets stricts) pour avoir plus de résultats
        // Surtout si on a beaucoup d'ingrédients
        if (ingredientsArray.length >= 5) {
          query = `recette ${ingredientsPrincipaux.join(" ")}`;
        } else {
          query = `"recette" ${ingredientsPrincipaux.join(" ")} "ingrédients" "préparation"`;
        }
      }
    } else if (filterQueryTerms) {
      // Sans ingrédients mais avec filtres : construire une requête plus flexible
      // Ne pas utiliser de guillemets stricts pour permettre plus de résultats
      query = `recette ${filterQueryTerms}`;
    } else {
      // Sans ingrédients ni filtres, chercher des recettes avec des termes qui indiquent une recette complète
      query = '"recette" "ingrédients" "préparation"';
    }
    
    // Exclure les pages de listes/compilations (moins agressif si on cherche uniquement avec filtres)
    if (ingredientsArray.length === 0 && filterQueryTerms) {
      // Recherche uniquement avec filtres : exclusions pour éviter les listes et astuces
      query += ' -"10 recettes" -"20 recettes" -"5 recettes" -"top 10" -"meilleures recettes" -"compilation" -"galerie" -"astuces" -"astuce" -"conseils" -"conseil" -"trucs" -"truc" -"guide" -"tutoriel" -"sélection" -"collection"';
    } else {
      // Recherche avec ingrédients : exclusions plus agressives pour éviter les listes et astuces
      query += ' -"10 recettes" -"20 recettes" -"5 recettes" -"liste de" -"top 10" -"meilleures recettes" -"compilation" -"galerie" -"repas à rabais" -"repas à prix réduit" -"recettes à petits prix" -"astuces" -"astuce" -"conseils" -"conseil" -"trucs" -"truc" -"façons" -"manières" -"projet" -"expérience" -"expérience culinaire" -"commerce" -"fait maison" -"lequel" -"comparaison" -"cuisine de groupe" -"restes" -"recettes du québec" -"comment faire" -"comment préparer" -"guide" -"tutoriel" -"sélection" -"collection"';
    }
    
    // Ajouter budget si nécessaire
    if (budgetParam) {
      query += ' "économique" "pas cher"';
    }
    
    // Rechercher 30 recettes pour avoir plus de choix (augmenté pour les recherches avec budget)
    const maxResults = budgetParam ? 30 : 20;
    console.log("🔎 [API] Recherche ciblée pour recettes individuelles:", query);
    const results = await performGoogleSearch(query, maxResults);
    results.forEach((item: any) => {
      if (!seenUrls.has(item.url)) {
        allItems.push(item);
        seenUrls.add(item.url);
      }
    });
    console.log(`✅ [API] ${results.length} recette(s) trouvée(s), ${allItems.length} unique(s)`);
    
    // Si on cherche uniquement avec des filtres (sans ingrédients), faire des recherches supplémentaires avec variantes
    if (ingredientsArray.length === 0 && filterQueryTerms) {
      // Faire des recherches supplémentaires avec différentes variantes pour maximiser les résultats
      // Si on a un budget, faire plus de variantes pour avoir plus de résultats
      const baseVariants = [
        `recette ${filterQueryTerms} facile`,
        `comment faire ${filterQueryTerms}`,
        `${filterQueryTerms} maison`,
      ];
      
      // Ajouter des variantes supplémentaires si on a un budget (pour avoir plus de résultats)
      const variantQueries = budgetParam ? [
        ...baseVariants,
        `recette ${filterQueryTerms} rapide`,
        `${filterQueryTerms} recette simple`,
        `recette ${filterQueryTerms} pas cher`,
      ] : baseVariants;
      
      for (const variantQuery of variantQueries) {
        const variantMaxResults = budgetParam ? 15 : 10;
        const variantResults = await performGoogleSearch(variantQuery, variantMaxResults);
        variantResults.forEach((item: any) => {
          if (!seenUrls.has(item.url)) {
            allItems.push(item);
            seenUrls.add(item.url);
          }
        });
        console.log(`✅ [API] Variante "${variantQuery}": ${variantResults.length} recette(s) trouvée(s), ${allItems.length} unique(s) au total`);
        
        // Arrêter si on a assez de résultats
        if (allItems.length >= 30) {
          break;
        }
      }
    }
    
    // Si on cherche avec des ingrédients, faire des recherches supplémentaires avec variantes pour avoir plus de résultats
    // IMPORTANT : Toujours faire des recherches supplémentaires avec ingrédients pour maximiser les résultats
    if (ingredientsArray.length > 0) {
      const nombreIngredients = Math.min(ingredientsArray.length, 3);
      const ingredientsPrincipaux = ingredientsArray.slice(0, nombreIngredients);
      
      // Faire des recherches avec différents sous-ensembles d'ingrédients pour avoir plus de variété
      const variantQueries: string[] = [];
      
      // Recherches avec les 2-3 premiers ingrédients
      variantQueries.push(
        `recette ${ingredientsPrincipaux.join(" ")} facile`,
        `comment faire ${ingredientsPrincipaux.join(" ")}`,
        `${ingredientsPrincipaux.join(" ")} recette`,
        `recette avec ${ingredientsPrincipaux.join(" ")}`,
      );
      
      // Si on a plus de 3 ingrédients, faire des recherches avec d'autres combinaisons
      if (ingredientsArray.length > 3) {
        // Prendre les ingrédients 1, 2, 4 (sauter le 3ème)
        const altIngredients = [ingredientsArray[0], ingredientsArray[1], ingredientsArray[3]].filter(Boolean);
        if (altIngredients.length >= 2) {
          variantQueries.push(`recette ${altIngredients.join(" ")}`);
        }
        
        // Prendre les ingrédients 2, 3, 4
        const altIngredients2 = [ingredientsArray[1], ingredientsArray[2], ingredientsArray[3]].filter(Boolean);
        if (altIngredients2.length >= 2) {
          variantQueries.push(`recette ${altIngredients2.join(" ")}`);
        }
      }
      
      // Ajouter les filtres si présents (seulement sur quelques variantes pour ne pas trop restreindre)
      if (filterQueryTerms && variantQueries.length > 0) {
        variantQueries.push(`recette ${ingredientsPrincipaux.join(" ")} ${filterQueryTerms}`);
      }
      
      // Limiter à 8 recherches supplémentaires pour ne pas dépasser les limites de l'API
      const maxVariantSearches = 8;
      for (let i = 0; i < Math.min(variantQueries.length, maxVariantSearches); i++) {
        if (allItems.length >= 40) {
          break; // Arrêter si on a assez de résultats
        }
        
        const variantQuery = variantQueries[i];
        const variantResults = await performGoogleSearch(variantQuery, 10);
        variantResults.forEach((item: any) => {
          if (!seenUrls.has(item.url)) {
            allItems.push(item);
            seenUrls.add(item.url);
          }
        });
        console.log(`✅ [API] Variante avec ingrédients "${variantQuery}": ${variantResults.length} recette(s) trouvée(s), ${allItems.length} unique(s) au total`);
      }
    }

    console.log(`📊 [API] ${ingredientsArray.length} ingrédient(s) total, ${allItems.length} recette(s) unique(s) trouvée(s)`);

    // Filtrer les sites indésirables (sites qui suggèrent plusieurs recettes à petit prix)
    // RÉDUIT : On bloque seulement les sites qui retournent vraiment des listes/compilations
    const blockedDomains = [
      "pinterest.com",
      "pinterest.ca",
      "recettes.qc.ca", // Site qui retourne souvent des compilations
      "lesgourmandisesdisa.com", // Site qui retourne des projets/articles
      "5ingredients15minutes.com", // Site qui retourne des articles de comparaison
      // Domaines anglais de recettes à exclure
      "allrecipes.com",
      "foodnetwork.com",
      "food.com",
      "tasty.co",
      "bbcgoodfood.com",
      "delish.com",
      "bonappetit.com",
      "epicurious.com",
      "seriouseats.com",
      "thespruceeats.com",
    ];
    
    // Sites à vérifier plus attentivement (mais ne pas bloquer complètement)
    // On les accepte mais on vérifie qu'ils ne sont pas des listes
    const suspiciousDomains = [
      "yummly.com",
      "cookpad.com",
    ];
    
    /**
     * Fonction robuste pour détecter les pages de listes, astuces et conseils (pas des recettes individuelles)
     * Version STRICTE : filtrer toutes les pages qui ne sont pas des recettes individuelles
     */
    const isListPage = (item: any): boolean => {
      if (!item.title && !item.snippet) return false;
      
      const titleLower = (item.title || "").toLowerCase();
      const snippetLower = (item.snippet || "").toLowerCase();
      const fullText = `${titleLower} ${snippetLower}`;
      
      // 1. Détecter les pages d'astuces, conseils et trucs
      const tipsPatterns = [
        /\b(astuce|astuces|conseil|conseils|truc|trucs|trucs?\s+et\s+astuces?)\b/i,
        /\b(comment\s+faire|comment\s+préparer|comment\s+cuisiner)\b/i,
        /\b(guide|guides?|tutoriel|tutoriels?)\b/i,
        /\b(meilleures?\s+façons?|meilleures?\s+manières?)\b/i,
      ];
      if (tipsPatterns.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 2. Détecter les pages de listes : nombre + "recettes/repas/idées"
      if (/\b(\d+)\s+(recettes?|repas|idées?|suggestions?|plats?|menus?)\b/i.test(fullText)) {
        return true;
      }
      
      // 3. Détecter les compilations, sélections, galeries
      const compilationPatterns = [
        /\b(compilation|galerie|sélection|collection|top\s+\d+|meilleures?\s+recettes?)\b/i,
        /^(découvrez|voici|consultez|explorez|nos|les)\s+(\d+)\s+(recettes?|repas|idées?)/i,
      ];
      if (compilationPatterns.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 4. Détecter les URLs qui suggèrent des listes ou astuces
      if (item.url) {
        const urlLower = item.url.toLowerCase();
        const listUrlPatterns = [
          /\/liste\//,
          /\/top-?\d+\//,
          /\/\d+-recettes\//,
          /\/compilation\//,
          /\/galerie\//,
          /\/astuce/,
          /\/conseil/,
          /\/truc/,
          /\/guide/,
          /\/tutoriel/,
          /recettes\.qc\.ca/i,
        ];
        if (listUrlPatterns.some(pattern => pattern.test(urlLower))) {
          return true;
        }
      }
      
      // 5. Détecter les pages de comparaison, projets, expériences
      const comparisonPatterns = [
        /^(du|le|la|quel|quelle|lequel|lesquels)\s+(commerce|fait\s+maison|revient|coûte)/i,
        /\b(projet|expérience|expérience\s+culinaire|commerce|fait\s+maison|lequel|comparaison)\b/i,
        /\b(apprendre|planifier|adapter)\s+(les?\s+)?(portions|recettes?|repas)/i,
      ];
      if (comparisonPatterns.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 6. Détecter les patterns avec ":" suivi d'un nombre (ex: "Recettes: 10 idées")
      if (/^[^:]*:\s*(\d+)\s+(recettes?|repas|idées?)/i.test(titleLower)) {
        return true;
      }
      
      // 7. Détecter les titres qui commencent par un nombre + "recettes/repas"
      if (/^\d+\s+(recettes?|repas|idées?)\s/i.test(titleLower)) {
        return true;
      }
      
      // 8. Détecter les pages avec "petits prix", "cuisine de groupe", "restes"
      if (/(petits?\s+prix|cuisine\s+de\s+groupe|restes|recettes?\s+du\s+québec)/i.test(fullText)) {
        return true;
      }
      
      return false;
    };
    
    /**
     * Fonction pour détecter si une recette est en français
     */
    const isFrenchRecipe = (item: any): boolean => {
      if (!item.title && !item.snippet) return true; // Accepter par défaut si pas de texte
      
      const titleLower = (item.title || "").toLowerCase();
      const snippetLower = (item.snippet || "").toLowerCase();
      const fullText = `${titleLower} ${snippetLower}`;
      
      // Mots-clés anglais communs qui indiquent une recette non-française
      const englishKeywords = [
        /\b(recipe|recipes|how to|ingredients|directions|instructions|prep time|cook time|servings|calories)\b/i,
        /\b(add|mix|stir|bake|fry|grill|roast|boil|simmer|season|taste|serve)\b/i,
        /\b(cup|cups|tablespoon|teaspoon|ounce|pound|lb|oz)\b/i,
      ];
      
      // Si on trouve des mots-clés anglais typiques, c'est probablement en anglais
      if (englishKeywords.some(pattern => pattern.test(fullText))) {
        return false;
      }
      
      // Mots-clés français communs qui indiquent une recette française
      const frenchKeywords = [
        /\b(recette|recettes|ingrédients|préparation|cuisson|portions|personnes)\b/i,
        /\b(ajouter|mélanger|remuer|cuire|faire|réserver|servir)\b/i,
        /\b(tasse|cuillère|cuillères|g|kg|ml|l)\b/i,
      ];
      
      // Si on trouve des mots-clés français, c'est probablement en français
      if (frenchKeywords.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // Par défaut, accepter (le paramètre lr=lang_fr de Google devrait déjà filtrer)
      return true;
    };
    
    const filteredByDomain = allItems.filter(item => {
      if (!item.source) return true;
      const domain = item.source.toLowerCase();
      
      // Exclure les domaines bloqués
      const isBlocked = blockedDomains.some(blocked => domain.includes(blocked));
      if (isBlocked) return false;
      
      // Exclure les URLs avec "/en/" (version anglaise)
      if (item.url) {
        const urlLower = item.url.toLowerCase();
        if (urlLower.includes("/en/") || urlLower.includes("/en?") || urlLower.endsWith("/en")) {
          return false;
        }
      }
      
      // Exclure les recettes non-françaises
      if (!isFrenchRecipe(item)) {
        return false;
      }
      
      // Pour les domaines suspects, vérifier qu'ils ne sont pas des listes
      const isSuspicious = suspiciousDomains.some(suspicious => domain.includes(suspicious));
      if (isSuspicious) {
        const isList = isListPage(item);
        if (isList) return false;
        // Sinon, accepter même si c'est un domaine suspect
        return true;
      }
      
      // Exclure TOUJOURS les pages de listes, astuces et conseils - filtrage strict à 100%
      const isList = isListPage(item);
      if (isList) {
        return false; // Toujours exclure les listes, astuces et conseils
      }
      
      return true;
    });
    
    console.log(`🚫 [API] ${allItems.length - filteredByDomain.length} recette(s) filtrée(s) (sites indésirables/listes), ${filteredByDomain.length} recette(s) conservée(s)`);

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
      
      // CORRECTION : Filtrer filteredByDomain, pas allItems !
      filteredItems = filteredByDomain.filter(item => {
        const titleLower = item.title.toLowerCase();
        const snippetLower = (item.snippet || "").toLowerCase();
        const textToSearch = `${titleLower} ${snippetLower}`;
        
        // Exclure si la recette contient un terme d'allergie
        const containsAllergy = searchTerms.some(term => 
          textToSearch.includes(term.toLowerCase())
        );
        
        return !containsAllergy;
      });

      console.log(`✅ [API] ${filteredItems.length} recette(s) après filtrage des allergies (${filteredByDomain.length - filteredItems.length} exclue(s))`);
    }

    // VALIDATION : Vérifier que les recettes correspondent bien aux filtres sélectionnés
    // IMPORTANT : Si on a des ingrédients, on est moins strict avec les filtres (car Google a déjà filtré)
    // Si on n'a pas d'ingrédients, on est plus strict pour s'assurer que les filtres sont respectés
    if (filtersArray.length > 0) {
      // Mapper les filtres vers des termes de validation (mots-clés à chercher dans titre/snippet)
      // Ces termes sont utilisés pour VALIDER que la recette correspond vraiment au filtre
      const filterValidationTerms: { [key: string]: string[] } = {
        "proteine": ["protéine", "proteine", "protein", "riche en protéines", "high protein", "high-protein"],
        "dessert": ["dessert", "gâteau", "gateau", "cake", "tarte", "tart", "muffin", "brownie", "cookie", "biscuit", "pudding", "crème", "creme", "mousse", "sorbet", "glace"],
        "smoothie": ["smoothie", "smoothies"],
        "soupe": ["soupe", "soup", "potage", "bouillon", "bisque", "chowder"],
        "salade": ["salade", "salad"],
        "petit-dejeuner": ["petit-déjeuner", "petit dejeuner", "breakfast", "déjeuner", "dejeuner", "matin"],
        "dejeuner": ["déjeuner", "dejeuner", "lunch", "midi"],
        "diner": ["dîner", "diner", "dinner", "soir"],
        "souper": ["souper", "supper", "dîner", "diner", "soir"],
        "collation": ["collation", "snack", "goûter", "gouter", "encas"],
        "pates": ["pâtes", "pates", "pasta", "spaghetti", "penne", "linguine", "fettuccine", "macaroni", "rigatoni", "fusilli", "ravioli", "lasagne", "lasagna"],
        "pizza": ["pizza", "pizzas"],
        "grille": ["grill", "grillé", "grille", "grillée", "grillee", "grillés", "grilles", "barbecue", "bbq", "au grill", "sur le grill", "grilled", "grilling", "charcoal", "charbon"],
        "vegetarien": ["végétarien", "vegetarien", "vegetarian", "sans viande", "no meat", "meatless"],
        "vegan": ["végétalien", "vegetalien", "vegan", "végan", "vegane", "plant-based", "sans produits animaux"],
        "sans-gluten": ["sans gluten", "gluten-free", "sans-gluten", "gluten free", "sans blé", "glutenfree", "gf"],
        "keto": ["keto", "cétogène", "cetogene", "ketogenic", "low carb", "faible en glucides", "low-carb", "keto-friendly"],
        "paleo": ["paléo", "paleo", "paleolithic", "paléolithique", "paleo diet"],
        "halal": ["halal"],
        "casher": ["casher", "kosher", "cacher"],
        "pescetarien": ["pescétarien", "pescetarien", "pescatarian", "pesco-végétarien", "pesco-vegetarian"],
        "rapide": ["rapide", "quick", "fast", "moins de 30 minutes", "30 minutes", "15 minutes", "20 minutes", "en 15 min", "en 20 min", "en 30 min"],
        "economique": ["économique", "economique", "pas cher", "bon marché", "bon marche", "cheap", "budget", "affordable", "low cost"],
        "sante": ["santé", "sante", "healthy", "health", "nutritif", "nutritive", "nutrition", "nutritious"],
        "comfort": ["réconfort", "reconfort", "comfort", "réconfortant", "reconfortant", "comfort food", "réconfortante"],
        "facile": ["facile", "easy", "simple", "simplement", "simples", "simplicity"],
        "gourmet": ["gourmet", "raffiné", "raffine", "sophistiqué", "sophistique", "gourmet", "refined", "sophisticated"],
        "sans-cuisson": ["sans cuisson", "no cook", "raw", "cru", "non cuit", "non cuite", "no-cook", "uncooked"],
      };

      // Filtres "optionnels" (caractéristiques) qui ne sont pas obligatoires si on a des ingrédients
      // Ces filtres sont plus des suggestions que des exigences strictes
      const optionalFilters = ["rapide", "economique", "sante", "comfort", "facile", "gourmet"];
      
      // Séparer les filtres obligatoires et optionnels
      const strictFilters = filtersArray.filter(f => !optionalFilters.includes(f));
      const optionalFilterList = filtersArray.filter(f => optionalFilters.includes(f));
      
      // Si on a des ingrédients, on valide seulement les filtres stricts (type de plat, régime)
      // Les filtres optionnels sont ignorés car Google a déjà filtré avec la requête
      const filtersToValidate = ingredientsArray.length > 0 ? strictFilters : filtersArray;

      if (filtersToValidate.length > 0) {
        // Pour chaque filtre, vérifier que la recette contient au moins un terme de validation
        filteredItems = filteredItems.filter(item => {
          const titleLower = (item.title || "").toLowerCase();
          const snippetLower = (item.snippet || "").toLowerCase();
          const textToSearch = `${titleLower} ${snippetLower}`;
          
          // Pour chaque filtre à valider, vérifier qu'au moins un terme de validation est présent
          const allFiltersMatch = filtersToValidate.every(filterId => {
            const validationTerms = filterValidationTerms[filterId];
            if (!validationTerms || validationTerms.length === 0) {
              // Si pas de termes de validation définis, accepter (filtre générique)
              return true;
            }
            
            // Vérifier si au moins un terme de validation est présent dans le titre ou snippet
            const matches = validationTerms.some(term => 
              textToSearch.includes(term.toLowerCase())
            );
            
            return matches;
          });
          
          return allFiltersMatch;
        });

        const excludedCount = filteredByDomain.length - filteredItems.length;
        if (ingredientsArray.length > 0) {
          console.log(`✅ [API] ${filteredItems.length} recette(s) après validation des filtres stricts (${excludedCount} exclue(s)). Filtres optionnels ignorés car recherche avec ingrédients.`);
        } else {
          console.log(`✅ [API] ${filteredItems.length} recette(s) après validation des filtres (${excludedCount} exclue(s) car ne correspondent pas aux filtres)`);
        }
      } else if (ingredientsArray.length > 0 && optionalFilterList.length > 0) {
        // Si on a seulement des filtres optionnels avec des ingrédients, on accepte toutes les recettes
        console.log(`✅ [API] ${filteredItems.length} recette(s) - Filtres optionnels seulement, validation ignorée car recherche avec ingrédients`);
      }
    }

    // Garder jusqu'à 30 recettes pour avoir plus de choix (augmenté de 20 à 30)
    // Si on a peu de résultats après filtrage, on garde tout ce qu'on a
    let items = filteredItems.length >= 10 
      ? filteredItems.slice(0, 30) 
      : filteredItems; // Garder toutes les recettes si on en a moins de 10

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
          
          // S'assurer que les portions sont bien présentes (ré-extraire si nécessaire)
          let servings = item.servings;
          if (!servings || servings === undefined) {
            const fullText = `${item.title || ""} ${item.snippet || ""}`;
            servings = extractServingsFromText(fullText) || undefined;
          }
          
          return {
            ...item,
            estimatedCost: result.estimatedCost,
            costSource: result.source, // "gpt" ou "rules"
            servings: servings, // S'assurer que servings est inclus
          };
        } catch (error) {
          logger.warn("Erreur lors de l'estimation du coût d'une recette", {
            error: error instanceof Error ? error.message : String(error),
            title: item.title,
          });
          
          // Ré-extraire les portions même en cas d'erreur
          let servings = item.servings;
          if (!servings || servings === undefined) {
            const fullText = `${item.title || ""} ${item.snippet || ""}`;
            servings = extractServingsFromText(fullText) || undefined;
          }
          
          return {
            ...item,
            estimatedCost: 10.00, // Prix moyen par défaut
            costSource: "fallback",
            servings: servings,
          };
        }
      })
    );

    // Filtrer par budget si nécessaire, puis sélectionner aléatoirement
    if (budget && budget > 0) {
      // Filtrer les recettes qui respectent le budget
      const itemsInBudget = itemsWithCost.filter((item) => {
        if (item.estimatedCost === null || item.estimatedCost === undefined) {
          // Si on n'a pas pu estimer le coût, on garde la recette (fallback)
          return true;
        }
        return item.estimatedCost <= budget;
      });

      // Si on n'a pas assez de recettes dans le budget, assouplir le filtre
      let finalItems = itemsInBudget;
      if (itemsInBudget.length < 10) {
        // Assouplir : accepter les recettes jusqu'à 150% du budget
        const relaxedBudget = budget * 1.5;
        const itemsRelaxed = itemsWithCost.filter((item) => {
          if (item.estimatedCost === null || item.estimatedCost === undefined) {
            return true;
          }
          return item.estimatedCost <= relaxedBudget;
        });
        
        // Trier par coût croissant (prioriser celles dans le budget strict)
        itemsRelaxed.sort((a, b) => {
          const costA = a.estimatedCost ?? Infinity;
          const costB = b.estimatedCost ?? Infinity;
          const inBudgetA = costA <= budget ? 0 : 1;
          const inBudgetB = costB <= budget ? 0 : 1;
          
          // D'abord celles dans le budget strict, puis par coût
          if (inBudgetA !== inBudgetB) {
            return inBudgetA - inBudgetB;
          }
          return costA - costB;
        });
        
        finalItems = itemsRelaxed;
        
        logger.warn("Budget assoupli pour avoir plus de résultats", {
          budgetStrict: budget,
          budgetRelaxed: relaxedBudget,
          recettesDansBudgetStrict: itemsInBudget.length,
          recettesDansBudgetRelaxe: itemsRelaxed.length,
        });
      } else {
        // Trier par coût croissant (moins cher en premier)
        finalItems.sort((a, b) => {
          const costA = a.estimatedCost ?? Infinity;
          const costB = b.estimatedCost ?? Infinity;
          return costA - costB;
        });
      }

      // Sélectionner aléatoirement entre 10 et 15 recettes parmi celles qui respectent le budget
      const minReturn = 10;
      const maxReturn = 15;
      
      if (finalItems.length >= minReturn) {
        // Mélanger et prendre entre 10 et 15 recettes
        const shuffled = [...finalItems].sort(() => Math.random() - 0.5);
        const count = Math.min(maxReturn, finalItems.length);
        items = shuffled.slice(0, count);
      } else {
        // Si on a moins de 10, on retourne toutes
        items = finalItems;
      }

      logger.info("Recettes filtrées par budget et sélectionnées aléatoirement", {
        budget,
        recettesAvant: itemsWithCost.length,
        recettesDansBudget: itemsInBudget.length,
        recettesRetournees: items.length,
      });
    } else {
      // Pas de budget, sélectionner aléatoirement entre 10 et 15 recettes
      const minReturn = 10;
      const maxReturn = 15;
      
      if (itemsWithCost.length >= minReturn) {
        // Mélanger et prendre entre 10 et 15 recettes
        const shuffled = [...itemsWithCost].sort(() => Math.random() - 0.5);
        const count = Math.min(maxReturn, itemsWithCost.length);
        items = shuffled.slice(0, count);
      } else {
        // Si on a moins de 10, on retourne toutes
        items = itemsWithCost;
      }
      
      logger.info("Recettes sélectionnées aléatoirement (sans filtre budget)", {
        recettesAvant: itemsWithCost.length,
        recettesRetournees: items.length,
      });
    }

    // 3️⃣ — Enrichir le cache (fusion avec les résultats existants)
    // Note: On ne cache pas les coûts car ils peuvent changer, mais on garde les portions
    // merge=true : fusionne avec le cache existant au lieu de le remplacer
    const itemsForCache = items.map(({ estimatedCost, ingredients, ...item }) => ({
      ...item,
      servings: item.servings, // S'assurer que servings est inclus dans le cache
    }));
    if (itemsForCache.length > 0) {
      await saveCache(cacheKey, itemsForCache, true); // merge=true pour enrichissement progressif
      console.log("💾 [API] Cache enrichi avec de nouvelles recettes (fusion avec existantes)");
    }

    // Log pour vérifier que les prix et portions sont bien inclus
    if (items.length > 0) {
      console.log("💰 [API] Exemple de recette avec prix et portions:", {
        title: items[0].title,
        estimatedCost: items[0].estimatedCost,
        hasCost: items[0].estimatedCost !== null && items[0].estimatedCost !== undefined,
        servings: items[0].servings,
        hasServings: items[0].servings !== null && items[0].servings !== undefined && items[0].servings > 0
      });
      
      // Log pour toutes les recettes qui ont des portions
      const withServings = items.filter((item: any) => item.servings && item.servings > 0);
      console.log(`📊 [API] ${withServings.length}/${items.length} recette(s) avec portions détectées`);
    }
    
    return NextResponse.json({ items, cached: false });
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);
