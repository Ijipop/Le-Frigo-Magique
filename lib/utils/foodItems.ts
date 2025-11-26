/**
 * Mapping des IDs d'aliments vers leurs noms
 * Cette liste doit correspondre à POPULAR_ITEMS dans CategoryItemSelector
 */
export const FOOD_ITEMS_MAP: Record<string, string> = {
  // Viande
  "1": "Poulet",
  "2": "Bœuf haché",
  "3": "Porc",
  "4": "Saumon",
  "5": "Dinde",
  "6": "Bacon",
  "7": "Steak",
  "8": "Côtelettes",
  "9": "Thon",
  "10": "Crevettes",
  // Fruits
  "11": "Pommes",
  "12": "Bananes",
  "13": "Oranges",
  "14": "Fraises",
  "15": "Raisins",
  "16": "Avocats",
  "17": "Myrtilles",
  "18": "Mangues",
  "19": "Ananas",
  "20": "Citrons",
  // Légumes
  "21": "Carottes",
  "22": "Brocoli",
  "23": "Tomates",
  "24": "Oignons",
  "25": "Ail",
  "26": "Poivrons",
  "27": "Courgettes",
  "28": "Épinards",
  "29": "Champignons",
  "30": "Laitue",
  "31": "Concombres",
  "32": "Pommes de terre",
  // Produits laitiers
  "33": "Lait",
  "34": "Fromage",
  "35": "Yogourt",
  "36": "Beurre",
  "37": "Œufs",
  "38": "Crème",
  "39": "Fromage cottage",
  "40": "Mozzarella",
  // Épicerie
  "41": "Pâtes",
  "42": "Riz",
  "43": "Pain",
  "44": "Huile d'olive",
  "45": "Farine",
  "46": "Sucre",
  "47": "Haricots",
  "48": "Lentilles",
  "49": "Quinoa",
  "50": "Pois chiches",
  "51": "Vinaigre",
  "52": "Sauce tomate",
  // Épices
  "53": "Sel",
  "54": "Poivre",
  "55": "Paprika",
  "56": "Curry",
  "57": "Cumin",
  "58": "Cannelle",
  "59": "Origan",
  "60": "Basilic",
  "61": "Thym",
  "62": "Romarin",
  "63": "Gingembre",
  "64": "Ail en poudre",
  // Boissons
  "65": "Eau",
  "66": "Jus d'orange",
  "67": "Café",
  "68": "Thé",
  "69": "Jus de pomme",
  "70": "Limonade",
  "71": "Lait d'amande",
  "72": "Jus de canneberge",
  // Autres
  "73": "Miel",
  "74": "Noix",
  "75": "Amandes",
  "76": "Chocolat",
  "77": "Biscuits",
  "78": "Chips",
  "79": "Beurre d'arachide",
  "80": "Confiture",
};

/**
 * Convertit une liste d'IDs d'aliments en leurs noms
 * Si l'ID n'est pas trouvé, on utilise l'ID tel quel (pour les aliments personnalisés)
 */
export function getFoodNames(itemIds: string[]): string[] {
  return itemIds.map((id) => FOOD_ITEMS_MAP[id] || id);
}

