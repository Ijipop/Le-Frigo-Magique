import { NextResponse } from "next/server";
import { withRateLimit, RateLimitConfigs } from "../../../../lib/utils/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { logger } from "../../../../lib/utils/logger";
import { searchByBudgetOnly } from "../../../../lib/utils/webRecipes/searchBudget";
import { performGoogleSearch } from "../../../../lib/utils/webRecipes/googleSearch";
import { isListPage, filterByDomain, filterByValidationTerms, FILTER_VALIDATION_TERMS } from "../../../../lib/utils/webRecipes/filters";
import { estimateRecipeCostAndServings, filterAndSelectByBudget } from "../../../../lib/utils/webRecipes/costEstimation";
import { checkCache, enrichCache } from "../../../../lib/utils/webRecipes/cacheManager";

// Runtime explicite pour Vercel (opérations longues avec Google API + Spoonacular)
export const runtime = "nodejs";

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
    const nbJoursParam = searchParams.get("nbJours") || "";

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

    // 🍴 NOUVEAU : Si recherche par budget uniquement (pas d'ingrédients), utiliser Spoonacular
    const isBudgetOnlySearch = budgetParam && budgetParam !== "" && ingredientsArray.length === 0;
    
    if (isBudgetOnlySearch) {
      console.log("🍴 [API] Recherche par budget uniquement - Utilisation de Spoonacular");
      
      const budgetResult = await searchByBudgetOnly({
        budget: budgetParam,
        typeRepas,
        allergies: allergiesArray,
        maxResults: 20, // Par défaut
        userId,
        nbJours: nbJoursParam,
        filtersArray,
      });

      if (budgetResult) {
        if (budgetResult.error) {
          return NextResponse.json(
            { items: [], error: budgetResult.error, details: budgetResult.details },
            { status: budgetResult.error === "Budget invalide" ? 400 : 500 }
          );
        }
        return NextResponse.json({
          items: budgetResult.items,
          cached: budgetResult.cached,
          source: budgetResult.source,
        });
      }
    }

    // 🚫 IMPORTANT : Si recherche par budget uniquement, NE PAS continuer avec Google Search
    // On a déjà retourné les résultats Spoonacular ci-dessus
    // Cette vérification empêche tout appel à Google Search pour les recherches par budget
    if (isBudgetOnlySearch) {
      console.log("⚠️ [API] Recherche par budget uniquement - Google Search ignoré (Spoonacular uniquement)");
      // Ce code ne devrait jamais être atteint car on a déjà retourné ci-dessus,
      // mais on le garde comme sécurité supplémentaire
      return NextResponse.json({
        items: [],
        cached: false,
        source: "spoonacular",
        error: "Recherche par budget uniquement - Spoonacular uniquement",
      });
    }

    // 1️⃣ — Vérifier le cache (conservation infinie avec enrichissement progressif)
    console.log("🔍 [API] Vérification du cache...");
    const cacheCheck = await checkCache(cacheKey, ingredientsArray);
    
    // Utiliser le cache si disponible et suffisant
    if (cacheCheck.useCache) {
      console.log(`✅ [API] Cache valide trouvé (${cacheCheck.cachedItems.length} recettes) - Utilisation du cache avec mélange aléatoire`);
      
      // Filtrer les résultats du cache
      const blockedDomains = [
        "pinterest.com", "pinterest.ca", "allrecipes.com", "food.com", "tasty.co",
        "delish.com", "thespruceeats.com", "simplyrecipes.com", "foodnetwork.com",
        "myrecipes.com", "eatingwell.com", "bonappetit.com", "epicurious.com",
        "seriouseats.com", "tasteofhome.com", "bettycrocker.com", "pillsbury.com",
        "kraftrecipes.com", "cookpad.com", "yummly.com",
        "recettes.qc.ca", "lesgourmandisesdisa.com", "5ingredients15minutes.com",
      ];
      
      const filteredCached = filterByDomain(cacheCheck.cachedItems, blockedDomains)
        .filter(item => !isListPage(item));
      
      console.log(`🚫 [API] Cache: ${cacheCheck.cachedItems.length} → ${filteredCached.length} après filtrage`);
      
      if (filteredCached.length >= 20) {
        // Mélanger aléatoirement et estimer les coûts
        const shuffled = [...filteredCached].sort(() => Math.random() - 0.5);
        const cachedWithCost = await Promise.all(
          shuffled.map(item => estimateRecipeCostAndServings(item))
        );
        
        // Sélectionner aléatoirement entre 10 et 15 recettes
        const minReturn = 10;
        const maxReturn = 15;
        const count = Math.min(maxReturn, cachedWithCost.length);
        const selected = cachedWithCost.slice(0, count);
        
        console.log(`🎲 [API] ${selected.length} recette(s) sélectionnée(s) aléatoirement depuis le cache`);
        return NextResponse.json({ items: selected, cached: true });
      }
    }
    
    // Si on a un cache avec très peu de résultats, les ajouter aux résultats initiaux
    const allItems: any[] = [];
    const seenUrls = new Set<string>();
    
    if (cacheCheck.shouldEnrich && cacheCheck.cachedItems.length > 0) {
      console.log(`📦 [API] Cache avec seulement ${cacheCheck.cachedItems.length} résultat(s) - Ajout aux résultats initiaux`);
      cacheCheck.cachedItems.forEach((item: any) => {
        if (item.url && !seenUrls.has(item.url)) {
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
    
    // 🚫 IMPORTANT : Ne pas utiliser Google Search si recherche par budget uniquement
    // (Spoonacular est déjà utilisé pour les recherches par budget uniquement)
    if (isBudgetOnlySearch) {
      console.log("⚠️ [API] Recherche par budget uniquement - Google Search ignoré");
      // Ne pas faire de recherche Google si on cherche uniquement par budget
      // Les résultats Spoonacular ont déjà été retournés plus haut
    } else {
      // Ajouter budget si nécessaire (mais seulement si on a aussi des ingrédients)
      if (budgetParam && ingredientsArray.length > 0) {
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
    }
    
    // Si on cherche uniquement avec des filtres (sans ingrédients), faire des recherches supplémentaires avec variantes
    // 🚫 IMPORTANT : Ne pas faire de recherches supplémentaires si recherche par budget uniquement
    if (ingredientsArray.length === 0 && filterQueryTerms && !isBudgetOnlySearch) {
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
    // 🚫 IMPORTANT : Ne pas faire de recherches supplémentaires si recherche par budget uniquement
    if (ingredientsArray.length > 0 && !isBudgetOnlySearch) {
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
        // 🚫 IMPORTANT : Ne pas utiliser Google Search si recherche par budget uniquement
        if (!isBudgetOnlySearch) {
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
    }

    console.log(`📊 [API] ${ingredientsArray.length} ingrédient(s) total, ${allItems.length} recette(s) unique(s) trouvée(s)`);

    // Filtrer les sites indésirables (sites qui suggèrent plusieurs recettes à petit prix)
    const blockedDomains = [
      "pinterest.com",
      "pinterest.ca",
      "recettes.qc.ca",
      "lesgourmandisesdisa.com",
      "5ingredients15minutes.com",
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
    
    const suspiciousDomains = ["yummly.com", "cookpad.com"];
    
    /**
     * Fonction pour détecter si une recette est en français
     */
    const isFrenchRecipe = (item: any): boolean => {
      if (!item.title && !item.snippet) return true;
      const titleLower = (item.title || "").toLowerCase();
      const snippetLower = (item.snippet || "").toLowerCase();
      const fullText = `${titleLower} ${snippetLower}`;
      
      const englishKeywords = [
        /\b(recipe|recipes|how to|ingredients|directions|instructions|prep time|cook time|servings|calories)\b/i,
        /\b(add|mix|stir|bake|fry|grill|roast|boil|simmer|season|taste|serve)\b/i,
        /\b(cup|cups|tablespoon|teaspoon|ounce|pound|lb|oz)\b/i,
      ];
      if (englishKeywords.some(pattern => pattern.test(fullText))) return false;
      
      const frenchKeywords = [
        /\b(recette|recettes|ingrédients|préparation|cuisson|portions|personnes)\b/i,
        /\b(ajouter|mélanger|remuer|cuire|faire|réserver|servir)\b/i,
        /\b(tasse|cuillère|cuillères|g|kg|ml|l)\b/i,
      ];
      if (frenchKeywords.some(pattern => pattern.test(fullText))) return true;
      
      return true; // Par défaut, accepter
    };
    
    // Filtrer par domaine et listes
    let filteredByDomain = filterByDomain(allItems, blockedDomains);
    filteredByDomain = filteredByDomain.filter(item => {
      // Exclure les URLs avec "/en/" (version anglaise)
      if (item.url) {
        const urlLower = item.url.toLowerCase();
        if (urlLower.includes("/en/") || urlLower.includes("/en?") || urlLower.endsWith("/en")) {
          return false;
        }
      }
      
      // Exclure les recettes non-françaises
      if (!isFrenchRecipe(item)) return false;
      
      // Pour les domaines suspects, vérifier qu'ils ne sont pas des listes
      if (item.source) {
        const domain = item.source.toLowerCase();
        const isSuspicious = suspiciousDomains.some(suspicious => domain.includes(suspicious));
        if (isSuspicious && isListPage(item)) return false;
      }
      
      // Exclure TOUJOURS les pages de listes
      if (isListPage(item)) return false;
      
      return true;
    });
    
    console.log(`🚫 [API] ${allItems.length - filteredByDomain.length} recette(s) filtrée(s) (sites indésirables/listes), ${filteredByDomain.length} recette(s) conservée(s)`);

    // Filtrer les recettes contenant des allergènes
    // IMPORTANT : Les allergies sont TOUJOURS respectées, même dans une recherche par budget uniquement
    // (sécurité/santé de l'utilisateur)
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
        const titleLower = (item.title || "").toLowerCase();
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

    // EXCLUSION AUTOMATIQUE : Exclure les desserts pour les recherches "souper"
    const isSouperSearch = typeRepas === 'souper' || filtersArray.includes('souper');
    if (isSouperSearch) {
      const dessertKeywords = [
        'dessert', 'muffin', 'muffins', 'gâteau', 'gateau', 'cake', 'cakes',
        'tarte', 'tart', 'tartes', 'tarts', 'brownie', 'brownies', 'cookie', 'cookies',
        'biscuit', 'biscuits', 'pudding', 'puddings', 'crème', 'creme', 'mousse',
        'sorbet', 'sorbets', 'glace', 'ice cream', 'icecream', 'sundae', 'sundaes',
        'pie', 'pies', 'cupcake', 'cupcakes', 'donut', 'donuts', 'doughnut', 'doughnuts',
        'waffle', 'waffles', 'pancake', 'pancakes', 'crepe', 'crepes', 'fudge',
        'candy', 'bonbon', 'bonbons', 'chocolate bar', 'chocolate cake', 'chocolate chip',
        'tiramisu', 'cheesecake', 'cheesecakes', 'flan', 'flan', 'custard', 'custards',
        'soufflé', 'souffle', 'soufflés', 'meringue', 'meringues', 'macaron', 'macarons',
        'eclair', 'eclairs', 'profiterole', 'profiteroles', 'cannoli', 'cannolis',
        'baklava', 'baklavas', 'truffle', 'truffles', 'fudge', 'fudges',
        'banana bread', 'chocolate bread', 'sweet bread', 'cinnamon bread', 'zucchini bread',
        'pumpkin bread', 'lemon bread', 'orange bread', 'glaze', 'glazed', 'frosting', 'icing'
      ];
      
      const beforeDessertFilter = filteredItems.length;
      filteredItems = filteredItems.filter(item => {
        const titleLower = (item.title || '').toLowerCase();
        const snippetLower = (item.snippet || '').toLowerCase();
        const textToCheck = `${titleLower} ${snippetLower}`;
        
        const isDessert = dessertKeywords.some(keyword => textToCheck.includes(keyword));
        if (isDessert) {
          console.log(`🚫 [API] Recette "${item.title}" exclue (dessert détecté pour recherche souper)`);
          return false;
        }
        return true;
      });
      
      const dessertsFiltered = beforeDessertFilter - filteredItems.length;
      if (dessertsFiltered > 0) {
        console.log(`🚫 [API] ${dessertsFiltered} dessert(s) filtré(s) pour recherche souper`);
      }
    }

    // VALIDATION : Vérifier que les recettes correspondent bien aux filtres sélectionnés
    if (filtersArray.length > 0 && !isBudgetOnlySearch) {
      const optionalFilters = ["rapide", "economique", "sante", "comfort", "facile", "gourmet"];
      const strictFilters = filtersArray.filter(f => !optionalFilters.includes(f));
      const filtersToValidate = ingredientsArray.length > 0 ? strictFilters : filtersArray;

      if (filtersToValidate.length > 0) {
        filteredItems = filterByValidationTerms(filteredItems, filtersToValidate, FILTER_VALIDATION_TERMS);
        const excludedCount = filteredByDomain.length - filteredItems.length;
        if (ingredientsArray.length > 0) {
          console.log(`✅ [API] ${filteredItems.length} recette(s) après validation des filtres stricts (${excludedCount} exclue(s)). Filtres optionnels ignorés car recherche avec ingrédients.`);
        } else {
          console.log(`✅ [API] ${filteredItems.length} recette(s) après validation des filtres (${excludedCount} exclue(s) car ne correspondent pas aux filtres)`);
        }
      }
    }

    // Garder jusqu'à 30 recettes pour avoir plus de choix (augmenté de 20 à 30)
    // Si on a peu de résultats après filtrage, on garde tout ce qu'on a
    let items = filteredItems.length >= 10 
      ? filteredItems.slice(0, 30) 
      : filteredItems; // Garder toutes les recettes si on en a moins de 10

    // 4️⃣ — Estimer le coût de chaque recette (approche rapide avec GPT ou règles)
    const budget = budgetParam ? parseFloat(budgetParam) : null;
    
    logger.info("Estimation rapide des coûts des recettes", {
      budget,
      nombreRecettes: items.length,
      method: process.env.OPENAI_API_KEY ? "gpt" : "rules",
    });

    // Estimer les coûts en parallèle (batch pour performance)
    const itemsWithCost = await Promise.all(
      items.map(item => estimateRecipeCostAndServings(item))
    );

    // Filtrer par budget si nécessaire, puis sélectionner aléatoirement
    items = filterAndSelectByBudget(itemsWithCost, budget);
    
    if (budget && budget > 0) {
      logger.info("Recettes filtrées par budget et sélectionnées aléatoirement", {
        budget,
        recettesAvant: itemsWithCost.length,
        recettesRetournees: items.length,
      });
    } else {
      logger.info("Recettes sélectionnées aléatoirement (sans filtre budget)", {
        recettesAvant: itemsWithCost.length,
        recettesRetournees: items.length,
      });
    }

    // 3️⃣ — Enrichir le cache (fusion avec les résultats existants)
    // Note: On ne cache pas les coûts car ils peuvent changer, mais on garde les portions
    const itemsForCache = items.map(({ estimatedCost, ingredients, ...item }) => ({
      ...item,
      servings: item.servings,
    }));
    if (itemsForCache.length > 0) {
      await enrichCache(cacheKey, itemsForCache, true);
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
