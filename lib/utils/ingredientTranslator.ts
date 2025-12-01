/**
 * Traduction des ingrédients anglais (Spoonacular) vers français
 * Pour permettre la comparaison avec le garde-manger et la recherche de prix
 */

/**
 * Dictionnaire de traduction anglais -> français pour les ingrédients courants
 */
const INGREDIENT_TRANSLATIONS: { [key: string]: string } = {
  // Viandes
  "chicken": "poulet",
  "beef": "boeuf",
  "ground beef": "boeuf hache",
  "pork": "porc",
  "salmon": "saumon",
  "tuna": "thon",
  "turkey": "dinde",
  "bacon": "bacon",
  "steak": "steak",
  "lamb": "agneau",
  "veal": "veau",
  "duck": "canard",
  "shrimp": "crevettes",
  "lobster": "homard",
  "crab": "crabe",
  "mussels": "moules",
  "oysters": "huitres",
  "scallops": "petoncles",
  "sausage": "saucisses",
  "ham": "jambon",
  
  // Légumes
  "carrot": "carotte",
  "carrots": "carottes",
  "broccoli": "brocoli",
  "tomato": "tomate",
  "tomatoes": "tomates",
  "onion": "oignon",
  "onions": "oignons",
  "garlic": "ail",
  "bell pepper": "poivron",
  "bell peppers": "poivrons",
  "zucchini": "courgette",
  "zucchinis": "courgettes",
  "spinach": "epinards",
  "mushroom": "champignon",
  "mushrooms": "champignons",
  "lettuce": "laitue",
  "cucumber": "concombre",
  "cucumbers": "concombres",
  "potato": "pomme de terre",
  "potatoes": "pommes de terre",
  "sweet potato": "patate douce",
  "sweet potatoes": "patates douces",
  "cauliflower": "chou-fleur",
  "cabbage": "chou",
  "brussels sprouts": "chou de bruxelles",
  "kale": "chou kale",
  "asparagus": "asperges",
  "green beans": "haricots verts",
  "peas": "petits pois",
  "corn": "mais",
  "eggplant": "aubergine",
  "eggplants": "aubergines",
  "celery": "celeri",
  "celery stalk": "branche de celeri",
  "celery stalks": "branches de celeri",
  
  // Fruits
  "apple": "pomme",
  "apples": "pommes",
  "banana": "banane",
  "bananas": "bananes",
  "orange": "orange",
  "oranges": "oranges",
  "strawberry": "fraise",
  "strawberries": "fraises",
  "grape": "raisin",
  "grapes": "raisins",
  "avocado": "avocat",
  "avocados": "avocats",
  "lemon": "citron",
  "lemons": "citrons",
  "lime": "lime",
  "limes": "limes",
  
  // Pâtes et céréales
  "pasta": "pates",
  "spaghetti": "spaghetti",
  "penne": "penne",
  "rice": "riz",
  "quinoa": "quinoa",
  "couscous": "couscous",
  "bread": "pain",
  "flour": "farine",
  "sugar": "sucre",
  
  // Laitiers
  "milk": "lait",
  "cheese": "fromage",
  "butter": "beurre",
  "cream": "creme",
  "yogurt": "yaourt",
  "eggs": "oeufs",
  "egg": "oeuf",
  
  // Autres
  "oil": "huile",
  "olive oil": "huile d'olive",
  "vegetable oil": "huile vegetale",
  "vinegar": "vinaigre",
  "salt": "sel",
  "pepper": "poivre",
  "black pepper": "poivre noir",
  "herbs": "herbes",
  "spices": "epices",
  "basil": "basilic",
  "oregano": "origan",
  "thyme": "thym",
  "rosemary": "romarin",
  "parsley": "persil",
  "cilantro": "coriandre",
  "ginger": "gingembre",
  "turmeric": "curcuma",
  "cumin": "cumin",
  "paprika": "paprika",
  "cinnamon": "cannelle",
  "nutmeg": "muscade",
  
  // Légumineuses
  "beans": "haricots",
  "black beans": "haricots noirs",
  "kidney beans": "haricots rouges",
  "chickpeas": "pois chiches",
  "lentils": "lentilles",
  "tofu": "tofu",
  
  // Noix et graines
  "almonds": "amandes",
  "almond": "amande",
  "walnuts": "noix",
  "walnut": "noix",
  "peanuts": "arachides",
  "peanut": "arachide",
  "sesame seeds": "graines de sesame",
  "sunflower seeds": "graines de tournesol",
  
  // Autres ingrédients courants
  "chicken breast": "poitrine de poulet",
  "chicken thighs": "cuisses de poulet",
  "chicken wings": "ailes de poulet",
  "ground turkey": "dinde hachee",
  "ground pork": "porc hache",
  "ground chicken": "poulet hache",
  "chicken broth": "bouillon de poulet",
  "beef broth": "bouillon de boeuf",
  "vegetable broth": "bouillon de legumes",
  "chicken stock": "fond de poulet",
  "beef stock": "fond de boeuf",
  "tomato paste": "concentre de tomate",
  "tomato sauce": "sauce tomate",
  "crushed tomatoes": "tomates concassees",
  "diced tomatoes": "tomates en des",
  "whole tomatoes": "tomates entieres",
  "coconut milk": "lait de coco",
  "coconut oil": "huile de coco",
  "soy sauce": "sauce soja",
  "worcestershire sauce": "sauce worcestershire",
  "hot sauce": "sauce piquante",
  "sriracha": "sriracha",
  "honey": "miel",
  "maple syrup": "sirop d'erable",
  "brown sugar": "sucre roux",
  "white sugar": "sucre blanc",
  "powdered sugar": "sucre en poudre",
  "baking powder": "levure chimique",
  "baking soda": "bicarbonate de soude",
  "vanilla extract": "extrait de vanille",
  "vanilla": "vanille",
};

/**
 * Traduit un ingrédient anglais vers le français
 * @param englishName - Nom de l'ingrédient en anglais
 * @returns Nom traduit en français, ou le nom original si pas de traduction trouvée
 */
export function translateIngredientToFrench(englishName: string): string {
  if (!englishName) return englishName;
  
  const normalized = englishName.toLowerCase().trim();
  
  // Chercher une traduction exacte
  if (INGREDIENT_TRANSLATIONS[normalized]) {
    return INGREDIENT_TRANSLATIONS[normalized];
  }
  
  // Chercher une traduction partielle (si l'ingrédient contient un mot clé)
  // Ex: "chicken breast" -> "poitrine de poulet"
  for (const [english, french] of Object.entries(INGREDIENT_TRANSLATIONS)) {
    if (normalized.includes(english) || english.includes(normalized)) {
      // Si c'est un match exact ou si le mot anglais est au début
      if (normalized.startsWith(english) || normalized === english) {
        return french;
      }
    }
  }
  
  // Si pas de traduction trouvée, essayer de traduire mot par mot
  const words = normalized.split(/\s+/);
  const translatedWords = words.map(word => {
    // Chercher chaque mot individuellement
    for (const [english, french] of Object.entries(INGREDIENT_TRANSLATIONS)) {
      const englishWords = english.split(/\s+/);
      if (englishWords.includes(word)) {
        return french;
      }
    }
    return word; // Garder le mot original si pas de traduction
  });
  
  // Si on a traduit au moins un mot, retourner la traduction
  if (translatedWords.some((w, i) => w !== words[i])) {
    return translatedWords.join(" ");
  }
  
  // Sinon, retourner le nom original (sera géré par le matcher qui a déjà des traductions)
  return englishName;
}

/**
 * Traduit une liste d'ingrédients anglais vers le français
 */
export function translateIngredientsToFrench(englishNames: string[]): string[] {
  return englishNames.map(translateIngredientToFrench);
}

