import { NextResponse } from "next/server";
import { getCachedResults, saveCache } from "../../../../lib/webSearchCache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const ingredientsParam = searchParams.get("ingredients") || "";
    const budgetParam = searchParams.get("budget") || "";
    const allergiesParam = searchParams.get("allergies") || "";
    const filtersParam = searchParams.get("filters") || "";

    const ingredientsArray = ingredientsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const allergiesArray = allergiesParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const filtersArray = filtersParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Normaliser et trier les ingrédients pour une clé de cache cohérente
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
    const cached = await getCachedResults(cacheKey);
    if (cached && cached.length > 0) {
      console.log(`✅ [API] ${cached.length} résultat(s) récupérés du cache`);
      return NextResponse.json({ items: cached, cached: true });
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

      return (data as any).items?.map((item: any) => ({
        title: item.title,
        url: item.link,
        image:
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src ||
          null,
        snippet: item.snippet,
        source: item.displayLink,
      })) ?? [];
    };

    // Mapper les filtres vers des termes de recherche Google
    const filterTerms: { [key: string]: string } = {
      "proteine": "riche en protéines",
      "dessert": "dessert",
      "smoothie": "smoothie",
      "soupe": "soupe",
      "salade": "salade",
      "petit-dejeuner": "petit-déjeuner",
      "collation": "collation",
      "vegetarien": "végétarien",
      "vegan": "végétalien",
      "sans-gluten": "sans gluten",
      "keto": "keto",
      "paleo": "paléo",
      "rapide": "rapide moins de 30 minutes",
      "economique": "économique pas cher",
      "sante": "santé",
      "comfort": "réconfort",
    };

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
      // Si pas d'ingrédients, recherche générique
      let q = "recette québécoise";
      if (budgetParam) {
        q += " économique pas cher";
      }
      if (filterQueryTerms) {
        q += ` ${filterQueryTerms}`;
      }
      const results = await performGoogleSearch(q);
      allItems.push(...results);
    }

    console.log(`📊 [API] ${ingredientsArray.length} ingrédient(s) total, ${allItems.length} recette(s) unique(s) trouvée(s)`);

    // Filtrer les recettes contenant des allergènes
    let filteredItems = allItems;
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
    const items = filteredItems.slice(0, 20);

    // 3️⃣ — Sauvegarder dans le cache (conservation infinie)
    if (items.length > 0) {
      await saveCache(cacheKey, items);
      console.log("💾 [API] Résultats sauvegardés dans le cache (conservation infinie)");
    }

    return NextResponse.json({ items, cached: false });
  } catch (error) {
    console.error("❌ [API] erreur inattendue:", error);
    return NextResponse.json(
      { items: [], error: "internal_error" },
      { status: 500 }
    );
  }
}
