/**
 * Système de fallback pour les prix d'ingrédients
 * Utilisé quand Flipp n'a pas de données ou pour les ingrédients rares
 * 
 * Cette fonction fournit des prix moyens manuels (estimations du marché québécois).
 * 
 * NOTE IMPORTANTE: Les prix gouvernementaux (CSV) sont gérés séparément:
 * - Ils sont accessibles via les routes API /api/ingredient-price et /api/gov-prices
 * - Cette fonction ne peut pas les utiliser directement car elle doit rester synchrone
 *   (utilisée côté client et serveur)
 * 
 * Prix moyens réalistes pour le Québec (en dollars CAD)
 * Basés sur des estimations du marché québécois
 */

export interface FallbackPrice {
  prix: number;
  categorie: string;
}

/**
 * Prix moyens par catégorie et ingrédient
 * Structure: categorie -> ingredient -> prix
 */
const FALLBACK_PRICES: Record<string, Record<string, number>> = {
  viande: {
    poulet: 12.99, // Prix moyen pour un poulet entier (~1.5-2kg)
    "poulet entier": 12.99,
    "poulet haché": 14.99, // Prix pour 500g-1kg
    "cuisses de poulet": 9.99, // Prix pour un paquet (~1kg)
    "poitrines de poulet": 16.99, // Prix pour un paquet (~600g-1kg)
    boeuf: 15.99, // Prix moyen pour 1kg (augmentation 2024)
    "bœuf": 15.99,
    "steak haché": 11.99, // Prix pour 500g-1kg
    "bœuf haché": 11.99,
    porc: 11.99, // Prix moyen pour 1kg
    "côtelettes de porc": 13.99, // Prix pour un paquet
    "jambon": 7.99, // Prix pour un paquet (~200-300g)
    agneau: 18.99, // Prix moyen pour 1kg
    veau: 19.99, // Prix moyen pour 1kg
    saucisse: 7.99, // Prix pour un paquet (~400-500g)
    bacon: 8.99, // Prix pour un paquet (~375g, 12-14 tranches)
    default: 13.00, // Prix moyen pour viande non spécifiée
  },
  poisson: {
    saumon: 14.99,
    thon: 8.99,
    "filet de saumon": 14.99,
    "filet de thon": 8.99,
    morue: 12.99,
    crevette: 14.99, // Prix réaliste pour crevettes au Québec (pas 2$!)
    crevettes: 14.99,
    "crevettes crues": 15.99,
    "crevettes cuites": 16.99,
    "crevettes décortiquées": 18.99,
    "fruits de mer": 13.99,
    homard: 18.99,
    crabe: 15.99,
    "filet de poisson": 12.99,
    "poisson blanc": 11.99,
    tilapia: 10.99,
    "pangasius": 9.99,
    default: 13.00,
  },
  pates: {
    pates: 2.99, // Prix pour un paquet (500g)
    pâtes: 2.99,
    spaghetti: 2.99,
    "pâtes spaghetti": 2.99,
    penne: 3.49,
    "pâtes penne": 3.49,
    riz: 4.99, // Prix pour un sac (1-2kg)
    "riz blanc": 4.99,
    "riz brun": 5.99,
    quinoa: 8.99, // Prix pour un sac (500g-1kg)
    couscous: 5.99, // Prix pour un paquet (500g)
    orzo: 4.49,
    default: 4.00,
  },
  legumes: {
    tomates: 3.49, // Prix pour un paquet (~1kg ou 4-6 tomates)
    tomate: 3.49,
    "tomates cerises": 5.99, // Prix pour un panier (~500g)
    carottes: 2.49, // Prix d'un sac de carottes (3 lb) - ajusté 2024
    carotte: 2.49,
    poivrons: 2.99, // Prix pour un paquet de 3-4 poivrons
    poivron: 2.99,
    "poivron rouge": 3.49,
    "poivron vert": 2.99,
    "poivron jaune": 3.49,
    oignons: 1.99, // Prix pour un sac (~2-3 lb)
    oignon: 1.99,
    "oignons verts": 2.49, // Prix pour un bouquet
    "oignons rouges": 2.49,
    "pommes de terre": 2.99, // Prix pour un sac (5-10 lb)
    "patates": 2.99,
    "patates douces": 3.99, // Prix pour un sac (~2-3 lb)
    laitue: 2.49, // Prix pour une tête
    salade: 2.49,
    "laitue romaine": 2.99,
    "légumes verts": 3.49,
    brocoli: 3.49, // Prix pour un bouquet
    choufleur: 3.99, // Prix pour une tête
    courgette: 2.49, // Prix pour 2-3 courgettes
    courgettes: 2.49,
    aubergine: 2.99, // Prix pour 1-2 aubergines
    champignons: 4.49, // Prix pour un paquet (~250-300g)
    champignon: 4.49,
    "champignons portobello": 5.99,
    "champignons shiitake": 6.99,
    "légumes congelés": 3.99, // Prix pour un sac (~500g-1kg)
    "haricots verts": 3.49, // Prix pour un paquet (~300-400g)
    "haricots jaunes": 3.49,
    "asperges": 5.99, // Prix pour un bouquet (~250-300g)
    "épinards": 3.49, // Prix pour un sac (~250-300g)
    "épinards frais": 3.99,
    "chou": 2.49, // Prix pour une tête
    "chou rouge": 2.99,
    "chou frisé": 4.49,
    "céleri": 2.49, // Prix pour un bouquet
    "concombre": 1.99, // Prix pour 2-3 concombres
    "radis": 2.49, // Prix pour un bouquet
    "navet": 2.49, // Prix pour un sac
    "panais": 3.49,
    default: 3.00,
  },
  fruits: {
    pommes: 7.99, // Prix d'un paquet de 12 pommes (ajusté 2024)
    pomme: 7.99,
    bananes: 1.99, // Prix d'un régime de bananes (~1.5-2kg)
    banane: 1.99,
    oranges: 5.99, // Prix d'un sac d'oranges (~2-3kg)
    orange: 5.99,
    fraises: 5.99, // Prix pour un panier (~500g-1lb)
    fraise: 5.99,
    bleuets: 6.99, // Prix pour un panier (~250-300g)
    framboises: 6.99, // Prix pour un panier (~125-150g)
    "fruits congelés": 5.99, // Prix pour un sac (~500g-1kg)
    default: 4.00,
  },
  laitier: {
    lait: 5.99, // Prix pour 2L (ajusté 2024)
    "lait 2%": 5.99,
    fromage: 7.99, // Prix pour un bloc (~200-300g)
    "fromage râpé": 6.99, // Prix pour un sac (~200g)
    beurre: 6.49, // Prix pour un bloc (454g)
    "beurre non salé": 6.49,
    yogourt: 5.99, // Prix pour un paquet de 4-6 unités
    "yaourt": 5.99,
    crème: 4.49, // Prix pour 500ml
    "crème 35%": 4.49,
    "crème sure": 3.99, // Prix pour 500ml
    "fromage cottage": 5.49, // Prix pour un contenant (~500g)
    default: 5.50,
  },
  epices: {
    sel: 1.99,
    poivre: 2.99,
    ail: 1.99,
    "gousses d'ail": 1.99,
    "herbes fraîches": 2.99,
    "herbes séchées": 3.99,
    "épices": 3.99,
    default: 2.50,
  },
  conserves: {
    "tomates en conserve": 2.49, // Prix pour une boîte (398ml)
    "haricots": 1.99, // Prix pour une boîte (398ml)
    "haricots rouges": 1.99,
    "haricots noirs": 1.99,
    "haricots blancs": 1.99,
    "boîte de haricots blancs": 1.99,
    "maïs en conserve": 1.99, // Prix pour une boîte (341ml)
    thon: 3.49, // Prix pour une boîte (170g)
    "thon en conserve": 3.49,
    default: 2.00,
  },
  autres: {
    huile: 6.99, // Prix pour 1L (augmentation 2024: +10.2%)
    "huile d'olive": 10.99, // Prix pour 500ml-1L
    "huile de canola": 5.99, // Prix pour 1L
    "huile végétale": 5.99,
    vinaigre: 4.49, // Prix pour 500ml-1L
    "vinaigre balsamique": 7.99, // Prix pour 250-500ml
    "vinaigre de cidre": 5.49, // Prix pour 500ml-1L
    farine: 5.99, // Prix pour 2.5kg
    "farine tout usage": 5.99,
    "farine de blé": 5.99,
    sucre: 4.49, // Prix pour 2kg
    "sucre blanc": 4.49,
    "sucre brun": 4.99, // Prix pour 1kg
    "cassonade": 4.99,
    oeufs: 5.49, // Prix pour une douzaine (augmentation 2024: +5.8%)
    "œufs": 5.49,
    "douzaine d'œufs": 5.49,
    pain: 3.49, // Prix pour une miche (~600g)
    "pain tranché": 3.49,
    "pain de blé entier": 3.99,
    "pain blanc": 3.49,
    "pain multigrain": 4.49,
    "naan": 4.49, // Prix pour un paquet de 4-6
    "tortillas": 3.99, // Prix pour un paquet de 8-10
    "pita": 3.49, // Prix pour un paquet de 6-8
    "mozzarella": 7.99, // Prix pour un bloc (~300-400g)
    "fromage mozzarella": 7.99,
    "sauce tomate": 2.49, // Prix pour une boîte (398ml)
    "pâte de tomate": 1.99, // Prix pour une boîte (156ml)
    "bouillon": 2.49, // Prix pour un cube ou 1L
    "bouillon de poulet": 2.49,
    "bouillon de légumes": 2.49,
    "levure": 5.49, // Prix pour un paquet
    "levure sèche": 5.49,
    "bicarbonate de soude": 2.49, // Prix pour une boîte
    "poudre à pâte": 3.49, // Prix pour une boîte
    default: 5.00,
  },
};

/**
 * Catégories d'ingrédients pour le matching
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  viande: ["poulet", "boeuf", "bœuf", "porc", "agneau", "veau", "saucisse", "bacon", "jambon", "steak"],
  poisson: ["saumon", "thon", "morue", "crevette", "homard", "crabe", "poisson", "fruits de mer"],
  pates: ["pates", "pâtes", "spaghetti", "penne", "riz", "quinoa", "couscous", "orzo"],
  legumes: ["tomate", "carotte", "poivron", "oignon", "patate", "pomme de terre", "laitue", "salade", "brocoli", "choufleur", "courgette", "aubergine", "champignon", "légume"],
  fruits: ["pomme", "banane", "orange", "fraise", "bleuet", "framboise", "fruit"],
  laitier: ["lait", "fromage", "beurre", "yogourt", "yaourt", "crème", "laitier"],
  epices: ["sel", "poivre", "ail", "herbe", "épice"],
  conserves: ["conserve", "haricot", "maïs", "canned"],
  autres: ["huile", "vinaigre", "farine", "sucre", "oeuf", "œuf", "pain"],
};

/**
 * Trouve la catégorie d'un ingrédient basée sur des mots-clés
 */
function findCategory(ingredient: string): string {
  const normalized = ingredient.toLowerCase().trim();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }
  
  return "autres";
}

/**
 * Normalise le nom d'un ingrédient pour le matching
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever accents
    .replace(/[^a-z0-9\s]/g, " ") // Enlever caractères spéciaux
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Obtient un prix de fallback pour un ingrédient
 * 
 * Cette fonction fournit des prix moyens manuels (estimations du marché québécois)
 * comme fallback quand les autres sources de prix ne sont pas disponibles.
 * 
 * NOTE: Les prix gouvernementaux (CSV) sont gérés séparément via:
 * - Route API: /api/ingredient-price (qui utilise getGovPrice côté serveur)
 * - Route API: /api/gov-prices (qui utilise govPriceLoader.server.ts)
 * 
 * Cette fonction doit rester synchrone car elle est utilisée côté client (React components)
 * et côté serveur (API routes). Les prix gouvernementaux nécessitent l'accès au système
 * de fichiers (fs) qui n'est disponible que côté serveur.
 * 
 * @param ingredient - Nom de l'ingrédient (ex: "poulet", "pâtes spaghetti")
 * @returns Prix en dollars CAD ou null si aucun fallback trouvé
 */
export function getFallbackPrice(ingredient: string): FallbackPrice | null {
  if (!ingredient || !ingredient.trim()) {
    return null;
  }

  // Utiliser les prix moyens manuels (fallback)
  const normalized = normalizeIngredientName(ingredient);
  const category = findCategory(normalized);
  const categoryPrices = FALLBACK_PRICES[category];

  if (!categoryPrices) {
    return null;
  }

  // Chercher d'abord un match exact
  if (categoryPrices[normalized]) {
    return {
      prix: categoryPrices[normalized],
      categorie: category,
    };
  }

  // Chercher un match partiel (l'ingrédient contient un mot-clé)
  for (const [key, price] of Object.entries(categoryPrices)) {
    if (key !== "default" && normalized.includes(key)) {
      return {
        prix: price,
        categorie: category,
      };
    }
  }

  // Utiliser le prix par défaut de la catégorie
  if (categoryPrices.default) {
    return {
      prix: categoryPrices.default,
      categorie: category,
    };
  }

  return null;
}

/**
 * Obtient tous les prix de fallback disponibles (pour debug/admin)
 */
export function getAllFallbackPrices(): Record<string, Record<string, number>> {
  return FALLBACK_PRICES;
}

