/**
 * Filtrage des résultats de recherche de recettes
 */

export interface RecipeItem {
  title?: string;
  snippet?: string;
  url?: string;
  source?: string;
}

/**
 * Détecte si une page est une liste/astuce plutôt qu'une recette individuelle
 */
export function isListPage(item: RecipeItem): boolean {
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
  if (tipsPatterns.some((pattern) => pattern.test(fullText))) {
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
  if (compilationPatterns.some((pattern) => pattern.test(fullText))) {
    return true;
  }

  // 4. Détecter les URLs qui suggèrent des listes ou astuces
  const suspiciousDomains = ["yummly.com", "cookpad.com"];
  if (item.url) {
    const urlLower = item.url.toLowerCase();
    for (const domain of suspiciousDomains) {
      if (urlLower.includes(domain)) {
        // Vérifier si c'est une page de liste
        if (
          /\/(list|lists|collection|collections|gallery|galleries|ideas|idees)/i.test(
            urlLower
          ) ||
          /\/(\d+)\s+(recettes?|recipes?)/i.test(urlLower)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Filtre les recettes par domaine
 */
export function filterByDomain(
  items: RecipeItem[],
  excludedDomains: string[]
): RecipeItem[] {
  if (excludedDomains.length === 0) return items;

  return items.filter((item) => {
    if (!item.url) return true;
    const urlLower = item.url.toLowerCase();
    return !excludedDomains.some((domain) => urlLower.includes(domain.toLowerCase()));
  });
}

/**
 * Filtre les recettes par mots-clés de validation
 */
export function filterByValidationTerms(
  items: RecipeItem[],
  filtersArray: string[],
  filterValidationTerms: Record<string, string[]>
): RecipeItem[] {
  if (filtersArray.length === 0) return items;

  // Filtres "optionnels" (caractéristiques) qui ne sont pas obligatoires si on a des ingrédients
  const optionalFilters = ["rapide", "economique", "sante", "comfort", "facile", "gourmet"];

  // Séparer les filtres obligatoires et optionnels
  const strictFilters = filtersArray.filter((f) => !optionalFilters.includes(f));
  const optionalFilterList = filtersArray.filter((f) => optionalFilters.includes(f));

  // Si on a seulement des filtres optionnels, on accepte toutes les recettes
  if (strictFilters.length === 0 && optionalFilterList.length > 0) {
    return items;
  }

  const filtersToValidate = strictFilters;

  if (filtersToValidate.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const titleLower = (item.title || "").toLowerCase();
    const snippetLower = (item.snippet || "").toLowerCase();
    const textToSearch = `${titleLower} ${snippetLower}`;

    // Pour chaque filtre à valider, vérifier qu'au moins un terme de validation est présent
    const allFiltersMatch = filtersToValidate.every((filterId) => {
      const validationTerms = filterValidationTerms[filterId];
      if (!validationTerms || validationTerms.length === 0) {
        return true; // Si pas de termes de validation définis, accepter
      }

      // Vérifier si au moins un terme de validation est présent
      const matches = validationTerms.some((term) =>
        textToSearch.includes(term.toLowerCase())
      );

      return matches;
    });

    return allFiltersMatch;
  });
}

/**
 * Termes de validation pour chaque filtre
 */
export const FILTER_VALIDATION_TERMS: Record<string, string[]> = {
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
  "pates": [
    "pâtes",
    "pates",
    "pasta",
    "spaghetti",
    "penne",
    "linguine",
    "fettuccine",
    "macaroni",
    "rigatoni",
    "fusilli",
    "ravioli",
    "lasagne",
    "lasagna",
  ],
  "pizza": ["pizza", "pizzas"],
  "grille": [
    "grill",
    "grillé",
    "grille",
    "grillée",
    "grillee",
    "grillés",
    "grilles",
    "barbecue",
    "bbq",
    "au grill",
    "sur le grill",
    "grilled",
    "grilling",
    "charcoal",
    "charbon",
  ],
  "vegetarien": ["végétarien", "vegetarien", "vegetarian", "sans viande", "no meat", "meatless"],
  "vegan": ["végétalien", "vegetalien", "vegan", "végan", "vegane", "plant-based", "sans produits animaux"],
  "sans-gluten": [
    "sans gluten",
    "gluten-free",
    "sans-gluten",
    "gluten free",
    "sans blé",
    "glutenfree",
    "gf",
  ],
  "keto": [
    "keto",
    "cétogène",
    "cetogene",
    "ketogenic",
    "low carb",
    "faible en glucides",
    "low-carb",
    "keto-friendly",
  ],
  "paleo": ["paléo", "paleo", "paleolithic", "paléolithique", "paleo diet"],
  "halal": ["halal"],
  "casher": ["casher", "kosher", "cacher"],
  "pescetarien": ["pescétarien", "pescetarien", "pescatarian", "pesco-végétarien", "pesco-vegetarian"],
  "rapide": [
    "rapide",
    "quick",
    "fast",
    "moins de 30 minutes",
    "30 minutes",
    "15 minutes",
    "20 minutes",
    "en 15 min",
    "en 20 min",
    "en 30 min",
  ],
  "economique": [
    "économique",
    "economique",
    "pas cher",
    "bon marché",
    "bon marche",
    "cheap",
    "budget",
    "affordable",
    "low cost",
  ],
  "sante": ["santé", "sante", "healthy", "health", "nutritif", "nutritive", "nutrition", "nutritious"],
  "comfort": [
    "réconfort",
    "reconfort",
    "comfort",
    "réconfortant",
    "reconfortant",
    "comfort food",
    "réconfortante",
  ],
  "facile": ["facile", "easy", "simple", "simplement", "simples", "simplicity"],
  "gourmet": ["gourmet", "raffiné", "raffine", "sophistiqué", "sophistique", "gourmet", "refined", "sophisticated"],
  "sans-cuisson": [
    "sans cuisson",
    "no cook",
    "raw",
    "cru",
    "non cuit",
    "non cuite",
    "no-cook",
    "uncooked",
  ],
  "japonais": [
    "japonais",
    "japanese",
    "japonaise",
    "sushi",
    "sashimi",
    "ramen",
    "teriyaki",
    "tempura",
    "miso",
    "yakitori",
    "udon",
    "soba",
    "tonkatsu",
    "katsu",
    "bento",
    "japon",
  ],
  "mexicain": [
    "mexicain",
    "mexican",
    "mexicaine",
    "tacos",
    "burrito",
    "enchilada",
    "quesadilla",
    "fajitas",
    "guacamole",
    "salsa",
    "tortilla",
    "chili",
    "mexique",
    "tex-mex",
  ],
  "indien": [
    "indien",
    "indian",
    "indienne",
    "curry",
    "tikka",
    "masala",
    "biryani",
    "dal",
    "naan",
    "samosa",
    "tandoori",
    "korma",
    "vindaloo",
    "indienne",
    "inde",
  ],
  "italien": [
    "italien",
    "italian",
    "italienne",
    "pasta",
    "pâtes",
    "risotto",
    "pizza",
    "lasagne",
    "lasagna",
    "carbonara",
    "bolognese",
    "parmesan",
    "mozzarella",
    "italie",
    "italienne",
  ],
  "chinois": [
    "chinois",
    "chinese",
    "chinoise",
    "stir-fry",
    "wok",
    "sauté",
    "sauté",
    "sweet and sour",
    "aigre-doux",
    "kung pao",
    "general tao",
    "chow mein",
    "fried rice",
    "riz frit",
    "chine",
  ],
  "thailandais": [
    "thaïlandais",
    "thai",
    "thailandais",
    "thailandaise",
    "pad thai",
    "curry",
    "tom yum",
    "green curry",
    "curry vert",
    "red curry",
    "curry rouge",
    "coconut",
    "noix de coco",
    "thaï",
    "thailande",
  ],
  "mediterraneen": [
    "méditerranéen",
    "mediterranean",
    "mediterraneen",
    "méditerranéenne",
    "grec",
    "greek",
    "grecque",
    "tzatziki",
    "hummus",
    "houmous",
    "falafel",
    "taboulé",
    "taboule",
    "olive",
    "feta",
    "méditerranée",
  ],
  "marocain": [
    "marocain",
    "moroccan",
    "marocaine",
    "tagine",
    "couscous",
    "couscous marocain",
    "tajine",
    "harira",
    "pastilla",
    "basteeya",
    "kefta",
    "merguez",
    "ras el hanout",
    "zaalouk",
    "charmoula",
    "maroc",
    "morocco",
  ],
};

