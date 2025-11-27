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
    } else {
      console.log("❌ [API] Cache non trouvé ou expiré - Nouvelle recherche Google");
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

    // Stratégie optimisée : Recherche ciblée pour des RECETTES INDIVIDUELLES uniquement
    // On cherche spécifiquement des recettes, pas des listes
    let query = "";
    
    if (ingredientsArray.length > 0) {
      // Utiliser les 2-3 premiers ingrédients pour une recherche plus précise
      const nombreIngredients = Math.min(ingredientsArray.length, 3);
      const ingredientsPrincipaux = ingredientsArray.slice(0, nombreIngredients);
      // Forcer une recette spécifique avec "comment faire" ou "ingrédients"
      query = `"recette" ${ingredientsPrincipaux.join(" ")} "ingrédients" "préparation"`;
    } else {
      // Sans ingrédients, chercher des recettes avec des termes qui indiquent une recette complète
      query = '"recette" "ingrédients" "préparation"';
    }
    
    // Ajouter les filtres de type de repas si fourni
    if (filterQueryTerms) {
      query += ` ${filterQueryTerms}`;
    }
    
    // Exclure TOUTES les pages de listes/compilations de manière très agressive
    query += ' -"10 recettes" -"20 recettes" -"5 recettes" -"liste de" -"top 10" -"meilleures recettes" -"compilation" -"galerie" -"repas à rabais" -"repas à prix réduit" -"recettes à petits prix" -"astuces" -"conseils" -"trucs" -"façons" -"manières" -"projet" -"expérience" -"expérience culinaire" -"commerce" -"fait maison" -"lequel" -"comparaison" -"cuisine de groupe" -"restes" -"recettes du québec"';
    
    // Ajouter budget si nécessaire
    if (budgetParam) {
      query += ' "économique" "pas cher"';
    }
    
    // Rechercher 20 recettes pour avoir plus de choix
    console.log("🔎 [API] Recherche ciblée pour recettes individuelles:", query);
    const results = await performGoogleSearch(query, 20);
    results.forEach((item: any) => {
      if (!seenUrls.has(item.url)) {
        allItems.push(item);
        seenUrls.add(item.url);
      }
    });
    console.log(`✅ [API] ${results.length} recette(s) trouvée(s), ${allItems.length} unique(s)`);

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
      "recettes.qc.ca", // Site qui retourne souvent des compilations
      "lesgourmandisesdisa.com", // Site qui retourne des projets/articles
      "5ingredients15minutes.com", // Site qui retourne des articles de comparaison
    ];
    
    /**
     * Fonction robuste pour détecter les pages de listes (pas des recettes individuelles)
     * Version renforcée pour filtrer plus agressivement les compilations
     */
    const isListPage = (item: any): boolean => {
      if (!item.title && !item.snippet) return false;
      
      const titleLower = (item.title || "").toLowerCase();
      const snippetLower = (item.snippet || "").toLowerCase();
      const fullText = `${titleLower} ${snippetLower}`;
      
      // 1. Détecter les nombres suivis de "recettes", "repas", "idées", etc. (plus agressif)
      const numberListPatterns = [
        /\b(\d+)\s+(recettes?|repas|idées?|astuces?|conseils?|trucs?|plats?|menus?|suggestions?)\b/i,
        /\b(\d+)\s+(recettes?|repas|idées?)\s+(facile|rapide|économique|à\s+rabais|à\s+prix\s+réduit|bon\s+marché)/i,
        /\b(\d+)\s+(recettes?|repas)\s+(pour|de|avec|sans)/i,
        /\b(\d+)\s+(recettes?|repas)\s+(à\s+)?(la\s+)?(mijoteuse|four|grill|poêle)/i,
      ];
      
      if (numberListPatterns.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 2. Détecter les patterns de listes avec mots-clés (renforcé)
      const listKeywords = [
        // Patterns avec "meilleures", "top", "liste", "compilation"
        /\b(meilleures?|top|liste|sélection|collection|compilation|galerie)\s+(de\s+)?(\d+\s+)?(recettes?|repas|idées?|plats?)/i,
        /\b(top|meilleures?)\s+(\d+)\s+(recettes?|repas|idées?)/i,
        /\b(compilation|galerie)\s+(de\s+)?(\d+\s+)?(recettes?|repas)/i,
        
        // Patterns avec "recettes" + adjectifs de liste (plus complet)
        /recettes?\s+(à\s+)?(petits?\s+prix|économiques?|pas\s+cher|budget|faciles?|rapides?|simples?|bon\s+marché)/i,
        /recettes?\s+(de|pour)\s+(la\s+)?(semaine|mois|famille|hiver|été)/i,
        /recettes?\s+(pour|à)\s+(économiser|réduire|diminuer)/i,
        
        // Patterns avec "repas" + nombre ou adjectifs (renforcé)
        /(\d+\s+)?repas\s+(à\s+)?(rabais|prix\s+réduit|économique|facile|rapide|bon\s+marché)/i,
        /repas\s+(de|pour)\s+(la\s+)?(semaine|mois)/i,
        /(\d+\s+)?repas\s+(pour|à)\s+(économiser|réduire)/i,
        
        // Patterns avec "mijoteuse" + nombre (renforcé)
        /(\d+)\s+(recettes?|repas)\s+(à\s+la\s+)?mijoteuse/i,
        /mijoteuse\s*:?\s*(\d+)\s+(recettes?|repas|idées?)/i,
        /(\d+)\s+(recettes?|repas)\s+(de|pour)\s+(la\s+)?mijoteuse/i,
        
        // Patterns avec "astuces", "conseils", "trucs" (renforcé)
        /\b(astuces?|conseils?|trucs?)\s+(pour|de|sur)\s+(bien\s+manger|économiser|cuisiner|manger\s+mieux)/i,
        /\b(\d+)\s+(astuces?|conseils?|trucs?)\s+(pour|de)/i,
        
        // Patterns généraux de listes (renforcé)
        /bien\s+manger\s+sans\s+trop\s+dépenser/i,
        /(\d+)\s+(façons|manières)\s+(de|pour)/i,
        /manger\s+(bien|mieux)\s+(pour|avec|sans)/i,
        
        // Patterns avec "à rabais", "à prix réduit" (renforcé)
        /(\d+)\s+(recettes?|repas)\s+à\s+(rabais|prix\s+réduit)/i,
        /recettes?\s+à\s+(rabais|prix\s+réduit|petits?\s+prix)/i,
        /(\d+)\s+(recettes?|repas)\s+(à\s+)?(petits?\s+prix|bon\s+marché)/i,
        
        // Patterns avec "facile", "rapide" + nombre (renforcé)
        /(\d+)\s+(recettes?|repas)\s+(facile|rapide|simple)/i,
        /(\d+)\s+(recettes?|repas)\s+(faciles?|rapides?|simples?)\s+(pour|de|à)/i,
        
        // Patterns avec "pour" + nombre + "personnes" (souvent des listes)
        /(\d+)\s+(recettes?|repas|idées?)\s+pour\s+(\d+)\s+personnes/i,
        
        // Nouveaux patterns pour détecter les compilations
        /(découvrez|voici|consultez|explorez)\s+(\d+)\s+(recettes?|repas|idées?)/i,
        /(\d+)\s+(recettes?|repas)\s+(à\s+)?(essayer|tester|découvrir)/i,
        /(nos|les|ces)\s+(\d+)\s+(recettes?|repas|idées?)/i,
        
        // NOUVEAUX PATTERNS pour détecter les articles/projets/comparaisons
        /\b(projet|expérience|expérience\s+culinaire)\s+(de|du|des?|canadien|québécois)/i,
        /\b(projet|expérience)\s+.*?(culinaire|canadien|québécois)/i,
        /(commerce|fait\s+maison|lequel|comparaison|comparer)\s+(revient|coûte|moins\s+cher|plus\s+cher)/i,
        /(du|le|la)\s+(commerce|fait\s+maison)\s+(ou|ou\s+lequel)/i,
        /(lequel|quelle)\s+(revient|coûte|est)\s+(le|la|moins|plus)\s+(cher|économique)/i,
        /(petits?\s+prix|cuisine\s+de\s+groupe|restes)\s*[|]/i, // Titre avec "|" suivi d'un site
        /recettes?\s+(du|de)\s+québec/i, // "Recettes du Québec" (souvent compilation)
        /(apprendre|apprendre\s+à|planifier|adapter)\s+(les?\s+)?(portions|recettes?|repas)/i, // Articles éducatifs
        /(bien|mieux)\s+(planifier|adapter|cuisiner|manger)/i,
      ];
      
      if (listKeywords.some(pattern => pattern.test(fullText))) {
        return true;
      }
      
      // 3. Détecter les titres qui commencent par un nombre (souvent des listes)
      // Exemples: "5 recettes...", "20 repas..."
      if (/^\d+\s+(recettes?|repas|idées?|astuces?|conseils?|suggestions?)/i.test(titleLower)) {
        return true;
      }
      
      // 4. Détecter les patterns avec ":" suivi d'un nombre (ex: "Recettes: 10 idées")
      if (/:\s*(\d+)\s+(recettes?|repas|idées?)/i.test(fullText)) {
        return true;
      }
      
      // 5. Détecter les snippets qui mentionnent explicitement plusieurs recettes (renforcé)
      if (snippetLower.match(/\b(\d+)\s+(recettes?|repas|idées?)\b/)) {
        // Si le snippet commence par "découvrez", "voici", "consultez" suivi d'un nombre, c'est une liste
        if (snippetLower.match(/^(découvrez|voici|consultez|explorez|nos|les)\s+(\d+)\s+(recettes?|repas|idées?)/i)) {
          return true;
        }
        // Si le snippet contient "compilation", "galerie", "sélection" avec un nombre, c'est une liste
        if (snippetLower.match(/\b(compilation|galerie|sélection|collection)\s+.*?(\d+)\s+(recettes?|repas)/i)) {
          return true;
        }
      }
      
      // 6. Détecter les URLs qui suggèrent des listes (ex: /recettes/, /liste/, /top-10/)
      if (item.url) {
        const urlLower = item.url.toLowerCase();
        const listUrlPatterns = [
          /\/recettes\/$/,
          /\/liste/,
          /\/top-?\d+/,
          /\/\d+-recettes/,
          /\/compilation/,
          /\/galerie/,
          /recettes\.qc\.ca/i, // Site "recettes.qc.ca" souvent des compilations
        ];
        if (listUrlPatterns.some(pattern => pattern.test(urlLower))) {
          return true;
        }
      }
      
      // 7. Détecter les titres qui contiennent "|" (pipe) - souvent des pages de compilation
      if (titleLower.includes("|")) {
        // Si le titre contient "|" et des mots-clés de compilation
        if (/(petits?\s+prix|cuisine\s+de\s+groupe|restes|recettes?\s+du\s+québec)/i.test(titleLower)) {
          return true;
        }
      }
      
      // 8. Détecter les titres qui sont des questions de comparaison
      if (/^(du|le|la|quel|quelle|lequel|lesquels)\s+(commerce|fait\s+maison|revient|coûte)/i.test(titleLower)) {
        return true;
      }
      
      // 9. Détecter les snippets qui parlent de "planifier", "adapter", "apprendre" (articles éducatifs)
      if (snippetLower.match(/(apprendre|planifier|adapter)\s+(les?\s+)?(portions|recettes?|repas)/i)) {
        return true;
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

    // Garder jusqu'à 20 recettes pour avoir plus de choix
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

      // Trier par coût croissant (moins cher en premier)
      itemsInBudget.sort((a, b) => {
        const costA = a.estimatedCost ?? Infinity;
        const costB = b.estimatedCost ?? Infinity;
        return costA - costB;
      });

      // Sélectionner aléatoirement entre 10 et 15 recettes parmi celles qui respectent le budget
      const minReturn = 10;
      const maxReturn = 15;
      
      if (itemsInBudget.length >= minReturn) {
        // Mélanger et prendre entre 10 et 15 recettes
        const shuffled = [...itemsInBudget].sort(() => Math.random() - 0.5);
        const count = Math.min(maxReturn, itemsInBudget.length);
        items = shuffled.slice(0, count);
      } else {
        // Si on a moins de 10, on retourne toutes
        items = itemsInBudget;
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
