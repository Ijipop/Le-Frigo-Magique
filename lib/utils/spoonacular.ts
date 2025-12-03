/**
 * Utilitaires pour l'API Spoonacular
 * Utilisé UNIQUEMENT pour les recherches par budget
 */

import { normalizeRecipeImage } from "./imageNormalizer";

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  pricePerServing: number;
  summary: string;
  dishTypes?: string[]; // Types de plats (breakfast, lunch, dinner, etc.)
}

interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
  offset: number;
  number: number;
  totalResults: number;
}

// Taux de change USD/CAD (1 CAD = 0.74 USD, donc 1 USD = 1/0.74 CAD ≈ 1.35 CAD)
const USD_TO_CAD_RATE = 1 / 0.74; // ≈ 1.35135
const CAD_TO_USD_RATE = 0.74;

/**
 * Recherche des recettes par budget via Spoonacular
 * @param maxPrice - Budget maximum en dollars CAD
 * @param typeRepas - Type de repas (breakfast, lunch, dinner, snack)
 * @param allergies - Liste des allergies à exclure
 * @param maxResults - Nombre maximum de résultats à retourner
 */
export async function searchRecipesByBudget(
  maxPrice: number, // Budget maximum en dollars CAD
  typeRepas?: string,
  allergies: string[] = [],
  maxResults: number = 20
): Promise<Array<{
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
  estimatedCost: number; // Coût TOTAL de la recette en dollars CAD (prix par portion × nombre de portions)
  servings: number | undefined;
  spoonacularId?: number; // ID Spoonacular pour récupérer le breakdown
}>> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  
  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY n'est pas configurée");
  }

  // 1. Créer une clé de cache basée sur les paramètres de recherche
  const { createSearchCacheKey, getCachedSpoonacularSearch } = await import("./spoonacularCache");
  const cacheKey = createSearchCacheKey(maxPrice, typeRepas, allergies, maxResults);
  
  // 2. Vérifier le cache dédié avant de faire l'appel API
  try {
    const cached = await getCachedSpoonacularSearch(cacheKey, maxResults);
    
    if (cached && cached.length > 0) {
      console.log(`💾 [Spoonacular] ${cached.length} recette(s) récupérée(s) depuis le cache dédié (0 appel API)`);
      return cached;
    }
  } catch (cacheError) {
    console.warn("⚠️ [Spoonacular] Erreur lors de la vérification du cache:", cacheError);
    // Continuer avec l'appel API si le cache échoue
  }

  // Mapper les types de repas vers les paramètres Spoonacular
  // Utiliser le paramètre "type" de l'API pour un filtrage fiable directement dans la requête
  // Au Québec : déjeuner = petit-déjeuner (breakfast), dîner = repas du midi (lunch), souper = repas du soir (dinner)
  const mealTypeMap: { [key: string]: string } = {
    "dejeuner": "breakfast",
    "déjeuner": "breakfast", // Alias avec accent
    "petit-dejeuner": "breakfast", // Alias pour petit-déjeuner
    "petit-déjeuner": "breakfast", // Alias avec accent
    "diner": "lunch",
    "dîner": "lunch", // Alias avec accent (au Québec, dîner = repas du midi)
    "lunch": "lunch", // Alias direct en anglais
    "souper": "main course", // Utiliser "main course" pour les soupers (plus fiable que "dinner")
    "dinner": "main course", // Alias en anglais (dinner = souper au Québec)
    "collation": "snack",
  };

  // Mapper les allergies vers les paramètres Spoonacular
  const dietMap: { [key: string]: string } = {
    "gluten": "gluten free",
    "lactose": "dairy free",
    "arachides": "peanut free",
    "noix": "tree nut free",
    "soja": "soy free",
    "poisson": "pescatarian",
    "crustaces": "shellfish free",
    "oeufs": "egg free",
    "fruits-de-mer": "shellfish free",
    "sulfites": "", // Spoonacular n'a pas de filtre spécifique pour les sulfites
    "sesame": "sesame free",
    "moutarde": "", // Spoonacular n'a pas de filtre spécifique pour la moutarde
  };

  // Convertir le budget CAD en USD pour Spoonacular
  // Spoonacular attend maxPrice en centimes USD, donc on multiplie par 100
  const maxPriceUSD = maxPrice * CAD_TO_USD_RATE; // Conversion CAD -> USD
  const maxPriceCents = Math.round(maxPriceUSD * 100); // Convertir en centimes
  
  // Construire les paramètres de recherche
  // addRecipeInformation=true permet d'obtenir les dishTypes directement dans la réponse
  // 🎯 STRATÉGIE POUR SAAS PROFESSIONNEL : Demander BEAUCOUP plus de résultats pour le cache
  // Cela permet de stocker un large pool de recettes dans le cache et de les mélanger à chaque fois
  // pour avoir de la variété et inspirer les utilisateurs avec des menus différents à chaque recherche
  // On demande 10x plus que maxResults pour avoir une excellente variété dans le cache
  const requestedCount = Math.max(maxResults * 10, 50); // 10x plus, minimum 50 pour avoir une excellente variété dans le cache
  const actualCount = Math.min(requestedCount, 100); // Maximum 100 pour avoir un pool très large de recettes en cache
  
  // Utiliser un offset aléatoire pour avoir de la variété (si Spoonacular le supporte)
  // Pour l'instant, on utilise sort: "random" qui donne déjà de la variété
  const params = new URLSearchParams({
    apiKey: apiKey,
    maxPrice: maxPriceCents.toString(), // Spoonacular attend un entier (en centimes USD)
    number: actualCount.toString(), // Maximum 100 résultats pour avoir un pool large de recettes en cache
    addRecipeInformation: "true", // Inclut dishTypes dans la réponse
    fillIngredients: "false",
    sort: "random", // Trier aléatoirement pour avoir de la variété à chaque recherche
    sortDirection: "asc",
  });
  
  console.log(`📊 [Spoonacular] Demande de ${actualCount} résultats (maxResults demandé: ${maxResults})`);

  // 🎯 UTILISER LE PARAMÈTRE "type" DIRECTEMENT DANS LA REQUÊTE API
  // C'est la façon la plus simple et la plus fiable de filtrer par type de repas
  // Spoonacular filtre directement côté serveur, évitant les recettes non pertinentes
  if (typeRepas && mealTypeMap[typeRepas.toLowerCase()]) {
    const spoonacularType = mealTypeMap[typeRepas.toLowerCase()];
    params.append("type", spoonacularType);
    console.log(`🍴 [Spoonacular] Filtrage par type: "${typeRepas}" → "${spoonacularType}"`);
  }

  // Ajouter les restrictions diététiques (allergies)
  const diets: string[] = [];
  allergies.forEach(allergy => {
    const diet = dietMap[allergy.toLowerCase()];
    if (diet && !diets.includes(diet)) {
      diets.push(diet);
    }
  });
  
  if (diets.length > 0) {
    // Spoonacular permet plusieurs restrictions, on prend la première compatible
    // ou on combine si possible
    params.append("diet", diets[0]); // Pour simplifier, on prend la première
  }

  // Langue française
  params.append("language", "fr");

  try {
    const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
    console.log(`🍴 [Spoonacular] Recherche par budget: ${maxPrice}$ CAD`);
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Spoonacular] Erreur HTTP ${response.status}:`, errorText);
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const data: SpoonacularSearchResponse = await response.json();
    
    console.log(`✅ [Spoonacular] ${data.results.length} recette(s) trouvée(s) sur ${data.totalResults} total`);

    // Fonction pour détecter le type de repas depuis dishTypes (plus fiable que le paramètre type)
    const detectMealType = (dishTypes: string[] | undefined): string | null => {
      if (!dishTypes || dishTypes.length === 0) return null;
      
      const types = dishTypes.map(t => t.toLowerCase());
      
      // Déjeuner (breakfast) - Au Québec : déjeuner = petit-déjeuner
      if (types.some(t => t === 'breakfast' || t === 'brunch' || t.includes('morning'))) {
        return 'dejeuner';
      }
      
      // Dîner (midi - lunch) - Au Québec : dîner = déjeuner
      if (types.some(t => t === 'lunch' || t === 'snack' || t === 'salad' || t === 'sandwich')) {
        return 'diner';
      }
      
      // Souper (repas principal du soir) - Au Québec : souper = dîner
      if (types.some(t => t === 'dinner' || t === 'main course' || t === 'main dish' || t === 'entree')) {
        return 'souper';
      }
      
      return null; // Type non détecté
    };

    // Fonction pour exclure les desserts et plats sucrés
    const isDessertOrSweet = (recipe: SpoonacularRecipe): boolean => {
      const titleLower = recipe.title.toLowerCase();
      const dishTypesLower = (recipe.dishTypes || []).map(t => t.toLowerCase());
      
      // Vérifier les dishTypes qui indiquent un dessert
      const dessertDishTypes = ['dessert', 'snack', 'antipasto', 'hor d\'oeuvre'];
      if (dishTypesLower.some(type => dessertDishTypes.includes(type))) {
        return true;
      }
      
      // Vérifier les mots-clés dans le titre qui indiquent un dessert ou plat sucré
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
        // Ajouter "bread" avec des mots sucrés (banana bread, chocolate bread, etc.)
        'banana bread', 'chocolate bread', 'sweet bread', 'cinnamon bread', 'zucchini bread',
        'pumpkin bread', 'lemon bread', 'orange bread', 'glaze', 'glazed', 'frosting', 'icing',
        // Ajouter "bites" (petites bouchées sucrées)
        'bites', 'peanut butter', 'peanut butter bites', 'pumpkin bites', 'energy bites',
        'protein bites', 'date bites', 'coconut bites', 'almond bites', 'chocolate bites',
        // Ajouter "pumpkin" dans les contextes sucrés (mais pas les plats salés à la citrouille)
        'pumpkin pie', 'pumpkin pie', 'pumpkin cake', 'pumpkin dessert', 'pumpkin cookie',
        'pumpkin muffin', 'pumpkin bread', 'pumpkin spice', 'pumpkin cheesecake',
        'pumpkin whipped cream', 'whipped cream', 'whipped', 'cream dessert',
        'pumpkin whipped cream', 'whipped cream', 'whipped', 'cream dessert',
        // Ajouter "bread" seul (pain simple, pas un plat principal)
        'bread', 'simit', 'bagel', 'bagels', 'roll', 'rolls', 'bun', 'buns',
        // Ajouter d'autres patterns de desserts
        'bread pudding', 'bread pudding', 'french toast', 'french toast', 'cinnamon roll',
        'cinnamon rolls', 'sweet roll', 'sweet rolls', 'danish', 'danishes', 'croissant',
        'croissants', 'pastry', 'pastries', 'scone', 'scones', 'muffin top', 'muffin tops'
      ];
      
      // Vérifier si le titre contient un mot-clé de dessert
      if (dessertKeywords.some(keyword => titleLower.includes(keyword))) {
        return true;
      }
      
      return false;
    };

    // Filtrer les recettes sans photo (TOUJOURS, avant tout autre filtrage)
    let filteredResults = data.results.filter(recipe => {
      const hasImage = recipe.image && recipe.image.trim() !== "" && recipe.image !== "null";
      if (!hasImage) {
        console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (pas de photo)`);
        return false;
      }
      return true;
    });
    
    const noImageCount = data.results.length - filteredResults.length;
    if (noImageCount > 0) {
      console.log(`🚫 [Spoonacular] ${noImageCount} recette(s) exclue(s) (pas de photo)`);
    }

    // 🎯 FILTRAGE STRICT PAR TYPE DE REPAS
    // Le paramètre "type" de Spoonacular donne une bonne base, mais on doit aussi vérifier les dishTypes
    // pour s'assurer que les recettes correspondent vraiment au type demandé
    if (typeRepas && mealTypeMap[typeRepas.toLowerCase()]) {
      const targetType = typeRepas.toLowerCase();
      const beforeCount = filteredResults.length;
      let filteredOut = 0;
      let dessertsFiltered = 0;
      
      // Normaliser le type (gérer les alias)
      // Normaliser tous les alias vers les noms canoniques
      let normalizedType = targetType;
      if (targetType === 'petit-dejeuner' || targetType === 'petit-déjeuner' || targetType === 'déjeuner') {
        normalizedType = 'dejeuner';
      } else if (targetType === 'dîner' || targetType === 'lunch') {
        normalizedType = 'diner';
      } else if (targetType === 'dinner') {
        normalizedType = 'souper'; // dinner en anglais = souper au Québec
      }
      
      filteredResults = filteredResults.filter(recipe => {
        const detectedType = detectMealType(recipe.dishTypes);
        const dishTypesLower = (recipe.dishTypes || []).map(t => t.toLowerCase());
        
        // Exclure les desserts pour tous les types de repas
        if (isDessertOrSweet(recipe)) {
          dessertsFiltered++;
          console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (dessert/plat sucré)`);
          return false;
        }
        
        // Si le type détecté correspond, on accepte
        if (detectedType === normalizedType) {
          return true;
        }
        
        // Pour déjeuner (petit-déjeuner) : doit être breakfast ou brunch
        if (normalizedType === 'dejeuner') {
          // Accepter si les dishTypes contiennent breakfast ou brunch
          if (dishTypesLower.some(t => t === 'breakfast' || t === 'brunch' || t.includes('morning'))) {
            return true;
          }
          // Exclure si c'est clairement un autre type de repas (lunch, dinner, etc.)
          if (dishTypesLower.some(t => t === 'lunch' || t === 'dinner' || t === 'main course')) {
            filteredOut++;
            console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (type incorrect: ${recipe.dishTypes?.join(', ') || 'aucun type'})`);
            return false;
          }
          // Si pas de dishTypes ou dishTypes vides, accepter (le paramètre "type" de Spoonacular a déjà filtré)
          return true;
        }
        
        // Pour dîner (midi) : doit être lunch, snack, salad, ou sandwich
        if (normalizedType === 'diner') {
          // Accepter si les dishTypes contiennent lunch, snack, salad, ou sandwich
          if (dishTypesLower.some(t => t === 'lunch' || t === 'snack' || t === 'salad' || t === 'sandwich')) {
            return true;
          }
          // Exclure si c'est clairement un autre type de repas (breakfast, dinner, etc.)
          if (dishTypesLower.some(t => t === 'breakfast' || t === 'dinner' || t === 'main course')) {
            filteredOut++;
            console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (type incorrect: ${recipe.dishTypes?.join(', ') || 'aucun type'})`);
            return false;
          }
          // Si pas de dishTypes ou dishTypes vides, accepter (le paramètre "type" de Spoonacular a déjà filtré)
          return true;
        }
        
        // Pour souper (repas principal du soir) : doit être dinner, main course, main dish, ou entree
        if (normalizedType === 'souper') {
          // Accepter si les dishTypes contiennent dinner, main course, main dish, ou entree
          if (dishTypesLower.some(t => t === 'dinner' || t === 'main course' || t === 'main dish' || t === 'entree')) {
            return true;
          }
          // Exclure si c'est clairement un autre type de repas (breakfast, lunch, etc.)
          if (dishTypesLower.some(t => t === 'breakfast' || t === 'lunch' || t === 'snack')) {
            filteredOut++;
            console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (type incorrect: ${recipe.dishTypes?.join(', ') || 'aucun type'})`);
            return false;
          }
          // Si pas de dishTypes ou dishTypes vides, accepter (le paramètre "type" de Spoonacular a déjà filtré)
          return true;
        }
        
        // Pour les autres types (collation, etc.), on accepte si détecté ou si pas de dishTypes
        return detectedType === normalizedType || dishTypesLower.length === 0;
      });
      
      if (dessertsFiltered > 0) {
        console.log(`🚫 [Spoonacular] ${dessertsFiltered} dessert(s) filtré(s) pour "${targetType}"`);
      }
      if (filteredOut > 0) {
        console.log(`🚫 [Spoonacular] ${filteredOut} recette(s) exclue(s) (type non correspondant) pour "${targetType}"`);
      }
      
      console.log(`🍴 [Spoonacular] Filtrage strict par type: ${beforeCount} → ${filteredResults.length} recette(s) pour "${typeRepas}"`);
    }

    // Mélanger les résultats pour avoir plus de variété (même si on a trié par random, on peut encore mélanger)
    const shuffledResults = [...filteredResults];
    for (let i = shuffledResults.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledResults[i], shuffledResults[j]] = [shuffledResults[j], shuffledResults[i]];
    }
    
    // IMPORTANT : Ne PAS limiter ici ! On va stocker TOUS les résultats filtrés dans le cache
    // pour avoir de la variété à chaque fois qu'on récupère du cache
    // On limitera seulement lors du retour (pour respecter maxResults) et lors de la récupération du cache
    console.log(`🎲 [Spoonacular] ${filteredResults.length} recette(s) après filtrage, ${shuffledResults.length} à mettre en cache (mélange aléatoire)`);
    
    // Transformer TOUS les résultats Spoonacular au format attendu par l'application
    // (pas seulement maxResults, pour avoir de la variété dans le cache)
    const transformedResults = shuffledResults.map(recipe => {
      // Conversion : pricePerServing de Spoonacular est en CENTIMES USD
      // Exemple : pricePerServing = 5 signifie 5 centimes USD = 0.05 USD
      // 1. Diviser par 100 pour convertir centimes -> dollars USD
      // 2. Convertir USD -> CAD en multipliant par le taux de change
      // Exemple : 5 centimes USD = 0.05 USD = 0.05 * USD_TO_CAD_RATE ≈ 0.0675 CAD
      const pricePerServingUSD = recipe.pricePerServing ? recipe.pricePerServing / 100 : 0;
      const pricePerServingCAD = pricePerServingUSD * USD_TO_CAD_RATE; // Conversion USD -> CAD
      
      // 🎯 IMPORTANT: estimatedCost doit être le COÛT TOTAL de la recette, pas le prix par portion
      // On multiplie le prix par portion par le nombre de portions pour obtenir le coût total
      const servings = recipe.servings || 1; // Par défaut 1 portion si non spécifié
      const estimatedCost = Math.round((pricePerServingCAD * servings) * 100) / 100; // Arrondir à 2 décimales
      
      // Log pour transparence (seulement si le prix semble anormalement bas)
      if (pricePerServingCAD > 0 && pricePerServingCAD < 0.10 && recipe.servings && recipe.servings > 0) {
        console.log(`💰 [Spoonacular] "${recipe.title}": ${pricePerServingCAD.toFixed(2)}$ CAD/portion × ${recipe.servings} portions = ${estimatedCost.toFixed(2)}$ CAD total (pricePerServing: ${recipe.pricePerServing} centimes USD)`);
      }
      
      // Normaliser l'URL de l'image pour éviter les problèmes avec foodista.com
      const normalizedImage = normalizeRecipeImage(recipe.image, recipe.id);

      return {
        title: recipe.title,
        url: recipe.sourceUrl,
        image: normalizedImage,
        snippet: recipe.summary 
          ? recipe.summary.replace(/<[^>]*>/g, "").substring(0, 200) // Nettoyer le HTML et limiter
          : "",
        source: "spoonacular.com",
        estimatedCost: estimatedCost, // Coût TOTAL de la recette en dollars CAD (prix par portion × nombre de portions)
        servings: recipe.servings || undefined,
        spoonacularId: recipe.id, // Stocker l'ID pour récupérer le breakdown plus tard
      };
    });

    // 3. Mettre en cache dédié pour les prochaines fois (cache permanent pour maximiser l'économie d'appels API)
    try {
      const { saveCachedSpoonacularSearch } = await import("./spoonacularCache");
      await saveCachedSpoonacularSearch(
        cacheKey,
        maxPrice,
        typeRepas,
        allergies,
        maxResults,
        transformedResults
      );
      console.log(`💾 [Spoonacular] ${transformedResults.length} recette(s) mises en cache dédié (permanent)`);
    } catch (cacheError) {
      console.warn("⚠️ [Spoonacular] Erreur lors de la mise en cache:", cacheError);
      // Ne pas faire échouer la fonction si le cache échoue
    }

    // Limiter aux maxResults demandés pour le retour (mais on a stocké TOUS les résultats dans le cache)
    const limitedResults = transformedResults.slice(0, maxResults);
    console.log(`📊 [Spoonacular] Retour de ${limitedResults.length} recette(s) sur ${transformedResults.length} en cache`);
    return limitedResults;

  } catch (error) {
    console.error("❌ [Spoonacular] Erreur lors de la recherche:", error);
    throw error;
  }
}

/**
 * Interface pour un ingrédient avec prix depuis Spoonacular
 */
export interface SpoonacularIngredient {
  name: string;
  amount: number;
  unit: string;
  price: number; // Prix en centimes USD
}

/**
 * Interface pour le breakdown de prix d'une recette Spoonacular
 */
export interface SpoonacularPriceBreakdown {
  ingredients: SpoonacularIngredient[];
  totalCost: number; // Coût total en centimes USD
}

/**
 * Interface pour les informations complètes d'une recette Spoonacular
 */
export interface SpoonacularRecipeInfo {
  id: number;
  title: string;
  extendedIngredients: Array<{
    id: number;
    name: string;
    original: string; // Ex: "2 cups flour"
    amount: number;
    unit: string;
    unitShort: string;
    unitLong: string;
  }>;
  servings: number;
}

/**
 * Récupère les informations complètes d'une recette Spoonacular (incluant les ingrédients)
 * @param recipeId - ID de la recette Spoonacular
 * @returns Informations de la recette avec ingrédients détaillés
 */
export async function getRecipeInformation(
  recipeId: number
): Promise<SpoonacularRecipeInfo> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  
  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY n'est pas configurée");
  }

  // 1. Vérifier le cache en base de données
  try {
    const { prisma } = await import("../prisma");
    // Prisma convertit les noms de modèles en camelCase : SpoonacularRecipeCache -> spoonacularRecipeCache
    const cached = await (prisma as any).spoonacularRecipeCache.findUnique({
      where: { spoonacularId: recipeId },
    });

    if (cached) {
      console.log(`💾 [Spoonacular] Informations récupérées depuis le cache pour la recette ${recipeId}`);
      const cachedData = cached.json as any;
      return {
        id: cachedData.id || recipeId,
        title: cachedData.title,
        extendedIngredients: cachedData.extendedIngredients || [],
        servings: cachedData.servings || 4,
      };
    }
  } catch (cacheError) {
    console.warn("⚠️ [Spoonacular] Erreur lors de la vérification du cache:", cacheError);
    // Continuer avec l'appel API si le cache échoue
  }

  // 2. Si pas dans le cache, faire l'appel API
  try {
    const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${apiKey}&includeNutrition=false`;
    console.log(`🍴 [Spoonacular] Appel API pour la recette ${recipeId}`);
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Spoonacular] Erreur HTTP ${response.status}:`, errorText);
      throw new Error(`Spoonacular API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`✅ [Spoonacular] Informations récupérées depuis l'API: ${data.extendedIngredients?.length || 0} ingrédient(s)`);

    const recipeInfo: SpoonacularRecipeInfo = {
      id: data.id,
      title: data.title,
      extendedIngredients: data.extendedIngredients || [],
      servings: data.servings || 4,
    };

    // 3. Mettre en cache pour les prochaines fois (stocker l'objet complet dans json)
    try {
      const { prisma } = await import("../prisma");
      await (prisma as any).spoonacularRecipeCache.upsert({
        where: { spoonacularId: recipeId },
        update: {
          json: recipeInfo as any, // Stocker l'objet complet
        },
        create: {
          spoonacularId: recipeId,
          json: recipeInfo as any, // Stocker l'objet complet
        },
      });
      console.log(`💾 [Spoonacular] Informations mises en cache pour la recette ${recipeId}`);
    } catch (cacheError) {
      console.warn("⚠️ [Spoonacular] Erreur lors de la mise en cache:", cacheError);
      // Ne pas faire échouer la fonction si le cache échoue
    }

    return recipeInfo;

  } catch (error) {
    console.error("❌ [Spoonacular] Erreur lors de la récupération des informations:", error);
    throw error;
  }
}

/**
 * Récupère le breakdown détaillé des prix d'une recette Spoonacular
 * Utilise l'endpoint /information pour obtenir les ingrédients, puis calcule le coût
 * 
 * @param recipeId - ID de la recette Spoonacular
 * @returns Breakdown des prix avec ingrédients (structure simplifiée pour compatibilité)
 */
export async function getRecipePriceBreakdown(
  recipeId: number
): Promise<SpoonacularPriceBreakdown> {
  // Utiliser l'endpoint /information qui est plus fiable que priceBreakdownWidget.json
  const recipeInfo = await getRecipeInformation(recipeId);
  
  // Transformer les ingrédients au format attendu
  const ingredients: SpoonacularIngredient[] = recipeInfo.extendedIngredients.map(ing => ({
    name: ing.name,
    amount: ing.amount || 0,
    unit: ing.unit || ing.unitShort || "",
    price: 0, // Le prix sera calculé par notre système (Flipp/cache/fallback)
  }));

  // Le coût total sera calculé par notre système, pas par Spoonacular
  return {
    ingredients,
    totalCost: 0, // Sera calculé par notre système
  };
}

