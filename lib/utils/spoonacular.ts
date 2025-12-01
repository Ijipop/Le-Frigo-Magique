/**
 * Utilitaires pour l'API Spoonacular
 * Utilisé UNIQUEMENT pour les recherches par budget
 */

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

/**
 * Recherche des recettes par budget via Spoonacular
 * @param maxPrice - Budget maximum en dollars CAD
 * @param typeRepas - Type de repas (breakfast, lunch, dinner, snack)
 * @param allergies - Liste des allergies à exclure
 * @param maxResults - Nombre maximum de résultats à retourner
 */
export async function searchRecipesByBudget(
  maxPrice: number,
  typeRepas?: string,
  allergies: string[] = [],
  maxResults: number = 20
): Promise<Array<{
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
  estimatedCost: number;
  servings: number | undefined;
  spoonacularId?: number; // ID Spoonacular pour récupérer le breakdown
}>> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  
  if (!apiKey) {
    throw new Error("SPOONACULAR_API_KEY n'est pas configurée");
  }

  // Mapper les types de repas vers les paramètres Spoonacular
  const mealTypeMap: { [key: string]: string } = {
    "dejeuner": "breakfast",
    "diner": "lunch",
    "souper": "dinner",
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

  // Convertir le budget CAD en USD pour Spoonacular (taux approximatif 1 CAD = 0.74 USD)
  // Spoonacular attend maxPrice en centimes USD, donc on multiplie par 100
  const maxPriceUSD = maxPrice * 0.74; // Conversion CAD -> USD
  const maxPriceCents = Math.round(maxPriceUSD * 100); // Convertir en centimes
  
  // Construire les paramètres de recherche
  // addRecipeInformation=true permet d'obtenir les dishTypes directement dans la réponse
  // STRATÉGIE OPTIMISÉE : Demander un nombre raisonnable (20-30) mais avec offset aléatoire
  // pour avoir de la variété sans gaspiller les appels API
  // On demande 3-4x plus que maxResults pour avoir de la marge après filtrage
  const requestedCount = Math.max(maxResults * 4, 20); // 4x plus, minimum 20 (au lieu de 50-100)
  const actualCount = Math.min(requestedCount, 30); // Maximum 30 pour économiser les appels API
  
  // Utiliser un offset aléatoire pour avoir de la variété (si Spoonacular le supporte)
  // Pour l'instant, on utilise sort: "random" qui donne déjà de la variété
  const params = new URLSearchParams({
    apiKey: apiKey,
    maxPrice: maxPriceCents.toString(), // Spoonacular attend un entier (en centimes USD)
    number: actualCount.toString(), // Maximum 30 résultats (au lieu de 50-100)
    addRecipeInformation: "true", // Inclut dishTypes dans la réponse
    fillIngredients: "false",
    sort: "random", // Trier aléatoirement pour avoir de la variété à chaque recherche
    sortDirection: "asc",
  });
  
  console.log(`📊 [Spoonacular] Demande de ${actualCount} résultats (maxResults demandé: ${maxResults})`);

  // NOTE: On n'utilise plus le paramètre "type" car il n'est pas fiable
  // On va filtrer par dishTypes après avoir reçu les résultats (voir plus bas)
  // Cela permet d'utiliser le champ dishTypes qui est plus fiable

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

    // Filtrer par type de repas si spécifié (en utilisant dishTypes au lieu du paramètre type)
    if (typeRepas && mealTypeMap[typeRepas.toLowerCase()]) {
      const targetType = typeRepas.toLowerCase();
      const beforeCount = filteredResults.length;
      let dessertsFiltered = 0;
      
      filteredResults = filteredResults.filter(recipe => {
        // EXCLUSION EXPLICITE : Si on recherche des soupers, exclure TOUS les desserts et plats sucrés
        if (targetType === 'souper' && isDessertOrSweet(recipe)) {
          dessertsFiltered++;
          console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (dessert/plat sucré)`);
          return false;
        }
        
        const detectedType = detectMealType(recipe.dishTypes);
        const matches = detectedType === targetType;
        
        // Si le type correspond, vérifier quand même que ce n'est pas un dessert
        if (matches) {
          if (isDessertOrSweet(recipe)) {
            dessertsFiltered++;
            console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (dessert/plat sucré malgré type ${targetType})`);
            return false;
          }
          return true;
        }
        
        // Si pas de type détecté et qu'on cherche souper, on accepte (par défaut)
        // MAIS seulement si ce n'est pas un dessert
        if (!detectedType && targetType === 'souper') {
          if (isDessertOrSweet(recipe)) {
            dessertsFiltered++;
            console.log(`🚫 [Spoonacular] Recette "${recipe.title}" exclue (dessert/plat sucré, type non détecté)`);
            return false;
          }
          return true;
        }
        
        return false;
      });
      
      if (dessertsFiltered > 0) {
        console.log(`🚫 [Spoonacular] ${dessertsFiltered} dessert(s) filtré(s) pour "${targetType}"`);
      }
      
      console.log(`🍴 [Spoonacular] Filtrage par dishTypes: ${beforeCount} → ${filteredResults.length} recette(s) pour "${typeRepas}"`);
      
      // Si aucun résultat après filtrage, log les dishTypes pour debug
      if (filteredResults.length === 0 && data.results.length > 0) {
        console.log(`⚠️ [Spoonacular] Aucun résultat après filtrage. Exemple de dishTypes:`, 
          data.results.slice(0, 3).map(r => ({ title: r.title, dishTypes: r.dishTypes }))
        );
      }
    }

    // Mélanger les résultats pour avoir plus de variété (même si on a trié par random, on peut encore mélanger)
    const shuffledResults = [...filteredResults];
    for (let i = shuffledResults.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledResults[i], shuffledResults[j]] = [shuffledResults[j], shuffledResults[i]];
    }
    
    // Limiter aux maxResults demandés APRÈS le mélange aléatoire
    const limitedResults = shuffledResults.slice(0, maxResults);
    
    console.log(`🎲 [Spoonacular] ${filteredResults.length} recette(s) après filtrage, ${limitedResults.length} retournée(s) (mélange aléatoire)`);
    
    // Transformer les résultats Spoonacular au format attendu par l'application
    return limitedResults.map(recipe => {
      // Conversion : pricePerServing de Spoonacular est en CENTIMES USD
      // Exemple : pricePerServing = 5 signifie 5 centimes USD = 0.05 USD
      // 1. Diviser par 100 pour convertir centimes -> dollars USD
      // 2. Convertir USD -> CAD : si 1 CAD = 0.74 USD, alors 1 USD = 1/0.74 CAD ≈ 1.35 CAD
      // Donc on MULTIPLIE par (1/0.74) pour convertir USD -> CAD
      // Exemple : 5 centimes USD = 0.05 USD = 0.05 * 1.35 = 0.0675 CAD ≈ 0.07 CAD
      const priceUSD = recipe.pricePerServing ? recipe.pricePerServing / 100 : 0;
      const priceCAD = priceUSD * (1 / 0.74);
      const estimatedCost = Math.round(priceCAD * 100) / 100; // Arrondir à 2 décimales
      
      // Log pour transparence (seulement si le prix semble anormalement bas)
      if (estimatedCost > 0 && estimatedCost < 0.10 && recipe.servings && recipe.servings > 0) {
        const totalCost = estimatedCost * recipe.servings;
        console.log(`💰 [Spoonacular] "${recipe.title}": ${estimatedCost.toFixed(2)}$/portion × ${recipe.servings} portions = ${totalCost.toFixed(2)}$ total (pricePerServing: ${recipe.pricePerServing} centimes USD)`);
      }
      
      return {
        title: recipe.title,
        url: recipe.sourceUrl,
        image: recipe.image || null,
        snippet: recipe.summary 
          ? recipe.summary.replace(/<[^>]*>/g, "").substring(0, 200) // Nettoyer le HTML et limiter
          : "",
        source: "spoonacular.com",
        estimatedCost: estimatedCost,
        servings: recipe.servings || undefined,
        spoonacularId: recipe.id, // Stocker l'ID pour récupérer le breakdown plus tard
      };
    });

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

