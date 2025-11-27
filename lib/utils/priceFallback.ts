/**
 * Système de fallback pour les prix d'ingrédients
 * Utilisé quand Flipp n'a pas de données ou pour les ingrédients rares
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
    poulet: 10.99,
    "poulet entier": 10.99,
    "poulet haché": 12.99,
    "cuisses de poulet": 8.99,
    "poitrines de poulet": 14.99,
    boeuf: 12.99,
    "bœuf": 12.99,
    "steak haché": 9.49,
    "bœuf haché": 9.49,
    porc: 9.99,
    "côtelettes de porc": 11.99,
    "jambon": 6.99,
    agneau: 15.99,
    veau: 16.99,
    saucisse: 6.99,
    bacon: 7.99,
    default: 11.50, // Prix moyen pour viande non spécifiée
  },
  poisson: {
    saumon: 14.99,
    thon: 8.99,
    "filet de saumon": 14.99,
    "filet de thon": 8.99,
    morue: 12.99,
    crevette: 12.99,
    crevettes: 12.99,
    "fruits de mer": 13.99,
    homard: 18.99,
    crabe: 15.99,
    default: 13.00,
  },
  pates: {
    pates: 2.29,
    pâtes: 2.29,
    spaghetti: 2.29,
    "pâtes spaghetti": 2.29,
    penne: 2.49,
    "pâtes penne": 2.49,
    riz: 3.99,
    "riz blanc": 3.99,
    "riz brun": 4.49,
    quinoa: 7.99,
    couscous: 4.99,
    orzo: 3.99,
    default: 3.50,
  },
  legumes: {
    tomates: 2.99,
    tomate: 2.99,
    carottes: 0.89,
    carotte: 0.89,
    poivrons: 1.49,
    poivron: 1.49,
    oignons: 1.29,
    oignon: 1.29,
    "pommes de terre": 1.99,
    "patates": 1.99,
    laitue: 1.99,
    salade: 1.99,
    "légumes verts": 2.49,
    brocoli: 2.99,
    choufleur: 2.99,
    courgette: 1.99,
    courgettes: 1.99,
    aubergine: 2.49,
    champignons: 3.99,
    champignon: 3.99,
    "légumes congelés": 3.49,
    default: 2.50,
  },
  fruits: {
    pommes: 1.99,
    pomme: 1.99,
    bananes: 1.49,
    banane: 1.49,
    oranges: 2.99,
    orange: 2.99,
    fraises: 4.99,
    fraise: 4.99,
    bleuets: 5.99,
    framboises: 5.99,
    "fruits congelés": 4.99,
    default: 3.50,
  },
  laitier: {
    lait: 5.29,
    "lait 2%": 5.29,
    fromage: 6.99,
    "fromage râpé": 5.99,
    beurre: 5.99,
    "beurre non salé": 5.99,
    yogourt: 4.99,
    "yaourt": 4.99,
    crème: 3.99,
    "crème 35%": 3.99,
    "crème sure": 3.49,
    "fromage cottage": 4.99,
    default: 5.00,
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
    "tomates en conserve": 1.99,
    "haricots": 1.49,
    "haricots rouges": 1.49,
    "haricots noirs": 1.49,
    "maïs en conserve": 1.29,
    thon: 2.99,
    "thon en conserve": 2.99,
    default: 1.75,
  },
  autres: {
    huile: 5.99,
    "huile d'olive": 8.99,
    vinaigre: 3.99,
    "vinaigre balsamique": 6.99,
    farine: 4.99,
    "farine tout usage": 4.99,
    sucre: 3.99,
    "sucre blanc": 3.99,
    oeufs: 4.79,
    "œufs": 4.79,
    pain: 2.99,
    "pain tranché": 2.99,
    default: 4.50,
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
 * @param ingredient - Nom de l'ingrédient (ex: "poulet", "pâtes spaghetti")
 * @returns Prix en dollars CAD ou null si aucun fallback trouvé
 */
export function getFallbackPrice(ingredient: string): FallbackPrice | null {
  if (!ingredient || !ingredient.trim()) {
    return null;
  }

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

