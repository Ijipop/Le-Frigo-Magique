// lib/ingredients/translateToFr.ts

// Type qui ressemble à ce que Spoonacular retourne pour chaque ingrédient
export interface SpoonacularIngredient {
  id: number;
  name: string; // "chicken breast"
  original: string; // "2 boneless skinless chicken breasts, diced"
  amount: number; // 2
  unit: string; // "piece", "g", "cup", "tbsp", etc.
}

// Type pour ta liste d'épicerie en français
export interface GroceryItem {
  id: number;
  nameFr: string; // "poitrine de poulet"
  quantity: number; // 2
  unitFr: string; // "unité", "g", "tasse", "c. à soupe", etc.
  originalEn: string; // texte complet original, pour référence
}

// 🧼 Mots de préparation à enlever pour normaliser
const PREP_WORDS = [
  'chopped',
  'minced',
  'diced',
  'sliced',
  'shredded',
  'grated',
  'crushed',
  'fresh',
  'ground',
  'boneless',
  'skinless',
  'large',
  'small',
  'medium',
  'extra-virgin',
  'extra virgin',
];

// 🧠 Dictionnaire anglais -> français pour les ingrédients
// Tu peux l'agrandir progressivement selon les recettes que tu vois passer.
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
  'chicken breast': 'poitrine de poulet',
  'chicken breasts': 'poitrines de poulet',
  'chicken thigh': 'haut de cuisse de poulet',
  'chicken thighs': 'hauts de cuisse de poulet',
  'chicken': 'poulet',
  'garlic': 'ail',
  'garlic clove': 'gousse d\'ail',
  'garlic cloves': 'gousses d\'ail',
  'onion': 'oignon',
  'onions': 'oignons',
  'shallot': 'échalote française',
  'shallots': 'échalotes françaises',
  'green onion': 'oignon vert',
  'green onions': 'oignons verts',
  'potato': 'pomme de terre',
  'potatoes': 'pommes de terre',
  'carrot': 'carotte',
  'carrots': 'carottes',
  'celery': 'céleri',
  'bell pepper': 'poivron',
  'bell peppers': 'poivrons',
  'red bell pepper': 'poivron rouge',
  'yellow bell pepper': 'poivron jaune',
  'green bell pepper': 'poivron vert',
  'tomato': 'tomate',
  'tomatoes': 'tomates',
  'cherry tomatoes': 'tomates cerises',
  'egg': 'œuf',
  'eggs': 'œufs',
  'milk': 'lait',
  'butter': 'beurre',
  'unsalted butter': 'beurre non salé',
  'salted butter': 'beurre salé',
  'cream': 'crème',
  'heavy cream': 'crème 35 %',
  'whipping cream': 'crème à fouetter',
  'sour cream': 'crème sûre',
  'flour': 'farine',
  'all purpose flour': 'farine tout usage',
  'cornstarch': 'fécule de maïs',
  'baking powder': 'poudre à pâte',
  'baking soda': 'bicarbonate de soude',
  'sugar': 'sucre',
  'brown sugar': 'cassonade',
  'powdered sugar': 'sucre en poudre',
  'icing sugar': 'sucre à glacer',
  'olive oil': 'huile d\'olive',
  'vegetable oil': 'huile végétale',
  'canola oil': 'huile de canola',
  'sesame oil': 'huile de sésame',
  'salt': 'sel',
  'kosher salt': 'sel casher',
  'sea salt': 'sel de mer',
  'black pepper': 'poivre noir',
  'pepper': 'poivre',
  'soy sauce': 'sauce soya',
  'fish sauce': 'sauce de poisson',
  'worcestershire sauce': 'sauce Worcestershire',
  'ketchup': 'ketchup',
  'mayonnaise': 'mayonnaise',
  'mustard': 'moutarde',
  'dijon mustard': 'moutarde de Dijon',
  'rice': 'riz',
  'white rice': 'riz blanc',
  'brown rice': 'riz brun',
  'pasta': 'pâtes',
  'spaghetti': 'spaghettis',
  'noodles': 'nouilles',
  'cheddar cheese': 'fromage cheddar',
  'parmesan cheese': 'fromage parmesan',
  'mozzarella cheese': 'fromage mozzarella',
  'cheese': 'fromage',
  'yogurt': 'yogourt',
  'lemon': 'citron',
  'lemons': 'citrons',
  'lemon juice': 'jus de citron',
  'lime': 'lime',
  'limes': 'limes',
  'lime juice': 'jus de lime',
  'basil': 'basilic',
  'parsley': 'persil',
  'cilantro': 'coriandre',
  'thyme': 'thym',
  'rosemary': 'romarin',
  'oregano': 'origan',
  'paprika': 'paprika',
  'smoked paprika': 'paprika fumé',
  'cumin': 'cumin',
  'curry powder': 'poudre de cari',
  'ginger': 'gingembre',
  'fresh ginger': 'gingembre frais',
  'ground ginger': 'gingembre moulu',
  'ginger root': 'racine de gingembre',
  'turmeric': 'curcuma',
  'cinnamon': 'cannelle',
  'nutmeg': 'muscade',
  'cardamom': 'cardamome',
  'coriander seeds': 'graines de coriandre',
  'caraway seeds': 'graines de carvi',
  'caraway seed': 'graine de carvi',
  'caraway': 'carvi',
  'bay leaf': 'feuille de laurier',
  'bay leaves': 'feuilles de laurier',
  'star anise': 'anis étoilé',
  'cloves': 'clous de girofle',
  'clove': 'clou de girofle',
  // Fruits de mer
  'shrimp': 'crevettes',
  'shrimps': 'crevettes',
  'prawn': 'crevette',
  'prawns': 'crevettes',
  'salmon': 'saumon',
  'tuna': 'thon',
  'cod': 'morue',
  'fish': 'poisson',
  'tilapia': 'tilapia',
  'halibut': 'flétan',
  // Viandes
  'beef': 'bœuf',
  'ground beef': 'bœuf haché',
  'beef steak': 'steak de bœuf',
  'steak': 'steak',
  'pork': 'porc',
  'ground pork': 'porc haché',
  'pork chop': 'côtelette de porc',
  'pork chops': 'côtelettes de porc',
  'bacon': 'bacon',
  'sausage': 'saucisse',
  'sausages': 'saucisses',
  'ham': 'jambon',
  'turkey': 'dinde',
  'ground turkey': 'dinde hachée',
  'lamb': 'agneau',
  // Légumineuses
  'black beans': 'fèves noires',
  'black bean': 'fève noire',
  'kidney beans': 'haricots rouges',
  'kidney bean': 'haricot rouge',
  'white beans': 'haricots blancs',
  'white bean': 'haricot blanc',
  'navy beans': 'haricots blancs',
  'pinto beans': 'haricots pinto',
  'chickpeas': 'pois chiches',
  'chickpea': 'pois chiche',
  'garbanzo beans': 'pois chiches',
  'lentils': 'lentilles',
  'lentil': 'lentille',
  'green lentils': 'lentilles vertes',
  'red lentils': 'lentilles rouges',
  'split peas': 'pois cassés',
  'split pea': 'pois cassé',
  // Légumes supplémentaires
  'bean sprouts': 'pousses de soja',
  'bean sprout': 'pousse de soja',
  'spring onion': 'oignon vert',
  'spring onions': 'oignons verts',
  'scallion': 'oignon vert',
  'scallions': 'oignons verts',
  'mushroom': 'champignon',
  'mushrooms': 'champignons',
  'button mushrooms': 'champignons de Paris',
  'shiitake mushrooms': 'champignons shiitake',
  'spinach': 'épinards',
  'broccoli': 'brocoli',
  'cauliflower': 'chou-fleur',
  'zucchini': 'courgette',
  'zucchinis': 'courgettes',
  'eggplant': 'aubergine',
  'eggplants': 'aubergines',
  'asparagus': 'asperges',
  'asparagus spear': 'asperge',
  'green beans': 'haricots verts',
  'green bean': 'haricot vert',
  'peas': 'petits pois',
  'pea': 'petit pois',
  'cucumber': 'concombre',
  'cucumbers': 'concombres',
  'lettuce': 'laitue',
  'romaine lettuce': 'laitue romaine',
  'cabbage': 'chou',
  'red cabbage': 'chou rouge',
  'brussels sprouts': 'choux de Bruxelles',
  'brussels sprout': 'chou de Bruxelles',
  'kale': 'chou frisé',
  'arugula': 'roquette',
  'radish': 'radis',
  'radishes': 'radis',
  'beet': 'betterave',
  'beets': 'betteraves',
  'sweet potato': 'patate douce',
  'sweet potatoes': 'patates douces',
  'butternut squash': 'courge musquée',
  'pumpkin': 'citrouille',
  'avocado': 'avocat',
  'avocados': 'avocats',
  // Fruits
  'banana': 'banane',
  'bananas': 'bananes',
  'apple': 'pomme',
  'apples': 'pommes',
  'orange': 'orange',
  'oranges': 'oranges',
  'strawberry': 'fraise',
  'strawberries': 'fraises',
  'blueberry': 'bleuet',
  'blueberries': 'bleuets',
  'raspberry': 'framboise',
  'raspberries': 'framboises',
  'blackberry': 'mûre',
  'blackberries': 'mûres',
  'mango': 'mangue',
  'mangoes': 'mangues',
  'mangos': 'mangues',
  'pineapple': 'ananas',
  'peach': 'pêche',
  'peaches': 'pêches',
  'pear': 'poire',
  'pears': 'poires',
  // Pâtes et nouilles
  'vermicelli': 'vermicelles',
  'rice noodles': 'nouilles de riz',
  'rice noodle': 'nouille de riz',
  'penne': 'penne',
  'fusilli': 'fusilli',
  'fettuccine': 'fettuccine',
  'linguine': 'linguine',
  'macaroni': 'macaroni',
  'lasagna': 'lasagne',
  'ravioli': 'ravioli',
  // Produits laitiers supplémentaires
  'feta cheese': 'fromage feta',
  'goat cheese': 'fromage de chèvre',
  'cream cheese': 'fromage à la crème',
  'ricotta cheese': 'ricotta',
  'cottage cheese': 'fromage cottage',
  'greek yogurt': 'yogourt grec',
  'plain yogurt': 'yogourt nature',
  // Noix et graines
  'almonds': 'amandes',
  'almond': 'amande',
  'walnuts': 'noix',
  'walnut': 'noix',
  'peanuts': 'arachides',
  'peanut': 'arachide',
  'cashews': 'noix de cajou',
  'cashew': 'noix de cajou',
  'pecans': 'pacanes',
  'pecan': 'pacane',
  'hazelnuts': 'noisettes',
  'hazelnut': 'noisette',
  'pistachios': 'pistaches',
  'pistachio': 'pistache',
  'sesame seeds': 'graines de sésame',
  'sesame seed': 'graine de sésame',
  'sunflower seeds': 'graines de tournesol',
  'sunflower seed': 'graine de tournesol',
  'chia seeds': 'graines de chia',
  'chia seed': 'graine de chia',
  'flax seeds': 'graines de lin',
  'flax seed': 'graine de lin',
  // Produits de base supplémentaires
  'chicken broth': 'bouillon de poulet',
  'chicken stock': 'bouillon de poulet',
  'beef broth': 'bouillon de bœuf',
  'beef stock': 'bouillon de bœuf',
  'vegetable broth': 'bouillon de légumes',
  'vegetable stock': 'bouillon de légumes',
  'tomato paste': 'pâte de tomate',
  'tomato sauce': 'sauce tomate',
  'crushed tomatoes': 'tomates en dés',
  'diced tomatoes': 'tomates en dés',
  'canned tomatoes': 'tomates en conserve',
  'vinegar': 'vinaigre',
  'white vinegar': 'vinaigre blanc',
  'balsamic vinegar': 'vinaigre balsamique',
  'apple cider vinegar': 'vinaigre de cidre',
  'red wine vinegar': 'vinaigre de vin rouge',
  'honey': 'miel',
  'maple syrup': 'sirop d\'érable',
  'molasses': 'mélasse',
  'vanilla extract': 'extrait de vanille',
  'vanilla': 'vanille',
  // Produits exotiques
  'coconut milk': 'lait de coco',
  'coconut cream': 'crème de coco',
  'coconut oil': 'huile de coco',
  'coconut': 'noix de coco',
  'tahini': 'tahini',
  'peanut butter': 'beurre d\'arachide',
  'almond butter': 'beurre d\'amande',
  // Épices et sauces
  'sambal oelek': 'sambal oelek',
  'sambal': 'sambal',
  'white pepper': 'poivre blanc',
  'flavoured white pepper': 'poivre blanc aromatisé',
  'flavored white pepper': 'poivre blanc aromatisé',
  'red pepper flakes': 'flocons de piment rouge',
  'red pepper': 'piment rouge',
  'chili powder': 'poudre de chili',
  'chili flakes': 'flocons de chili',
  'cayenne pepper': 'poivre de Cayenne',
  'hot sauce': 'sauce piquante',
  'sriracha': 'sriracha',
  'hoisin sauce': 'sauce hoisin',
  'oyster sauce': 'sauce aux huîtres',
  'teriyaki sauce': 'sauce teriyaki',
  'barbecue sauce': 'sauce barbecue',
  'ranch dressing': 'vinaigrette ranch',
  'italian dressing': 'vinaigrette italienne',
  // Autres
  'water': 'eau',
  'boneless chicken breast': 'poitrine de poulet désossée',
  'boneless chicken breasts': 'poitrines de poulet désossées',
  'chicken breast meat': 'viande de poitrine de poulet',
  'corn oil': 'huile de maïs',
  'corn': 'maïs',
  'corn kernels': 'grains de maïs',
  'frozen corn': 'maïs congelé',
  'naan': 'naan',
  'bread': 'pain',
  'breadcrumbs': 'chapelure',
  'breadcrumb': 'chapelure',
  'panko': 'chapelure panko',
  'tortilla': 'tortilla',
  'tortillas': 'tortillas',
  'taco shells': 'coquilles à taco',
  'taco shell': 'coquille à taco',
  'chocolate': 'chocolat',
  'dark chocolate': 'chocolat noir',
  'milk chocolate': 'chocolat au lait',
  'cocoa powder': 'poudre de cacao',
  'cocoa': 'cacao',
};

// 🧪 Unités : anglais -> français (version simple)
const UNIT_TRANSLATIONS: Record<string, string> = {
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  l: 'L',
  liter: 'L',
  liters: 'L',
  cup: 'tasse',
  cups: 'tasses',
  tbsp: 'c. à soupe',
  tablespoon: 'c. à soupe',
  tablespoons: 'c. à soupe',
  tsp: 'c. à thé',
  teaspoon: 'c. à thé',
  teaspoons: 'c. à thé',
  pinch: 'pincée',
  pinches: 'pincées',
  dash: 'pincée',
  dashes: 'pincées',
  piece: 'unité',
  pieces: 'unités',
  slice: 'tranche',
  slices: 'tranches',
  clove: 'gousse',
  cloves: 'gousses',
};

// 🔧 Normalise le nom d'ingrédient pour matcher les clés du dictionnaire
export function normalizeIngredientName(raw: string): string {
  let name = raw.toLowerCase().trim();
  
  // Enlève les virgules et parenthèses
  name = name.replace(/[(),]/g, ' ');
  
  // Enlève les mots de préparation (chopped, minced, etc.)
  for (const prep of PREP_WORDS) {
    const re = new RegExp(`\\b${prep}\\b`, 'g');
    name = name.replace(re, ' ');
  }
  
  // Remplace les multiples espaces par un seul
  name = name.replace(/\s+/g, ' ').trim();
  
  return name;
}

// 🗣 Traduit le nom en français, avec fallback au nom original si inconnu
export function translateIngredientName(raw: string): string {
  if (!raw || raw.trim().length === 0) {
    return raw;
  }
  
  const normalized = normalizeIngredientName(raw);
  const rawLower = raw.toLowerCase().trim();
  
  // Essayer d'abord avec le nom normalisé
  if (INGREDIENT_TRANSLATIONS[normalized]) {
    return INGREDIENT_TRANSLATIONS[normalized];
  }
  
  // Essayer avec le nom original en minuscules
  if (INGREDIENT_TRANSLATIONS[rawLower]) {
    return INGREDIENT_TRANSLATIONS[rawLower];
  }
  
  // Essayer de trouver une correspondance partielle (ex: "shrimp" dans "medium sized shrimp")
  for (const [english, french] of Object.entries(INGREDIENT_TRANSLATIONS)) {
    if (normalized.includes(english) || rawLower.includes(english)) {
      return french;
    }
  }
  
  // Fallback : garder l'original
  return raw;
}

// 📏 Traduit l'unité en français (ou garde l'original si inconnue)
export function translateUnit(unit: string): string {
  if (!unit) return '';
  
  const key = unit.toLowerCase().trim();
  return UNIT_TRANSLATIONS[key] ?? unit;
}

// 🎯 Fonction principale : transforme un ingrédient Spoonacular
// en item de liste d'épicerie en français.
export function toGroceryItem(ing: SpoonacularIngredient): GroceryItem {
  const originalName = ing.name || ing.original || "";
  const nameFr = translateIngredientName(originalName);
  const unitFr = translateUnit(ing.unit);
  
  // Log pour debug (seulement si mozzarella ou naan)
  if (originalName.toLowerCase().includes("mozzarella") || originalName.toLowerCase().includes("naan") || 
      nameFr.toLowerCase().includes("mozzarella") || nameFr.toLowerCase().includes("naan")) {
    console.log(`🔍 [TranslateToFr] TRADUCTION DÉTECTÉE:`, {
      originalName,
      nameFr,
      unitFr,
      amount: ing.amount,
      id: ing.id,
    });
  }
  
  return {
    id: ing.id,
    nameFr,
    quantity: ing.amount,
    unitFr,
    originalEn: ing.original,
  };
}

// 🧺 Optionnel : transformer directement un tableau d'ingrédients
export function toGroceryList(ingredients: SpoonacularIngredient[]): GroceryItem[] {
  return ingredients.map(toGroceryItem);
}

