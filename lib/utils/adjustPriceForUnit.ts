/**
 * Ajuste le prix d'un ingrédient selon l'unité et la quantité
 * Cette fonction est utilisée côté client pour calculer les prix affichés
 * 
 * @param basePrice - Prix de base du produit complet (paquet, bloc, boîte, etc.)
 * @param quantity - Quantité nécessaire
 * @param unit - Unité (tranche, c. à soupe, unité, g, ml, etc.)
 * @param ingredientName - Nom de l'ingrédient (pour détecter le type de produit)
 * @returns Prix ajusté pour la quantité réelle
 */
export function adjustPriceForUnit(
  basePrice: number,
  quantity: number,
  unit: string | null,
  ingredientName?: string
): number {
  if (!basePrice || basePrice <= 0) return 0;
  if (!quantity || quantity <= 0) return 0;
  
  const unitLower = (unit || "").toLowerCase();
  const ingredientLower = (ingredientName || "").toLowerCase();
  
  // Pour les produits vendus par unité complète (boîte, paquet, canne, etc.)
  // Si l'unité est "unité" et que le nom contient "boîte", "paquet", "canne", "conteneur", etc.
  // Le prix de base est déjà pour une unité complète
  if (unitLower.includes("unité") || unitLower === "unite") {
    const isCompleteProduct = ingredientLower.includes("boîte") || 
                             ingredientLower.includes("boite") ||
                             ingredientLower.includes("paquet") ||
                             ingredientLower.includes("canne") ||
                             ingredientLower.includes("can") ||
                             ingredientLower.includes("conteneur") ||
                             ingredientLower.includes("bouteille") ||
                             ingredientLower.includes("bocal") ||
                             ingredientLower.includes("pot");
    
    if (isCompleteProduct) {
      // Produit complet : multiplier le prix par la quantité
      // Ex: 2 boîtes de haricots = 2 × prix d'une boîte
      return basePrice * quantity;
    } else {
      // Sinon, c'est probablement une partie d'un paquet
      // Utiliser une fraction conservatrice (assumer 10 unités par paquet)
      return (basePrice / 10) * quantity;
    }
  }
  
  // Pour les tranches (bacon, fromage, etc.)
  if (unitLower.includes("tranche")) {
    // Bacon : un paquet contient généralement 12-16 tranches
    // Utiliser 14 tranches comme moyenne
    const slicesPerPackage = ingredientLower.includes("bacon") ? 14 : 12;
    return (basePrice / slicesPerPackage) * quantity;
  }
  
  // Pour les cuillères à soupe (beurre, huile, etc.)
  if (unitLower.includes("soupe") || unitLower.includes("c. à soupe") || unitLower.includes("c a soupe")) {
    // Beurre : un bloc = 454g, 1 c. à soupe = 15g
    // Huile : 1L, 1 c. à soupe = 15ml
    if (ingredientLower.includes("beurre") || ingredientLower.includes("butter")) {
      // Beurre : prix pour 454g, donc 1 c. à soupe (15g) = (basePrice / 454) * 15
      return (basePrice / 454) * (quantity * 15);
    } else {
      // Autres liquides : prix pour 1L, donc 1 c. à soupe (15ml) = (basePrice / 1000) * 15
      return (basePrice / 1000) * (quantity * 15);
    }
  }
  
  // Pour les cuillères à thé
  if (unitLower.includes("thé") || unitLower.includes("c. à thé") || unitLower.includes("c a the") || 
      unitLower.includes("café") || unitLower.includes("c. à café")) {
    // 1 c. à thé = 5g/5ml
    if (ingredientLower.includes("beurre") || ingredientLower.includes("butter")) {
      return (basePrice / 454) * (quantity * 5);
    } else {
      return (basePrice / 1000) * (quantity * 5);
    }
  }
  
  // Pour les tasses
  if (unitLower.includes("tasse")) {
    // 1 tasse = 250ml/g
    if (ingredientLower.includes("beurre") || ingredientLower.includes("butter")) {
      return (basePrice / 454) * (quantity * 250);
    } else {
      return (basePrice / 1000) * (quantity * 250);
    }
  }
  
  // Pour les grammes
  if (unitLower.includes("g") && !unitLower.includes("kg")) {
    // Prix généralement pour 1kg, donc diviser par 1000
    return (basePrice / 1000) * quantity;
  }
  
  // Pour les kilogrammes
  if (unitLower.includes("kg")) {
    return basePrice * quantity;
  }
  
  // Pour les millilitres
  if (unitLower.includes("ml") && !unitLower.includes("l")) {
    // Prix généralement pour 1L, donc diviser par 1000
    return (basePrice / 1000) * quantity;
  }
  
  // Pour les litres
  if (unitLower.includes("l") || unitLower.includes("litre")) {
    return basePrice * quantity;
  }
  
  // Pour les gousses, têtes, etc.
  if (unitLower.includes("gousse") || unitLower.includes("tête") || unitLower.includes("tete")) {
    // Assumer 10 gousses/têtes par paquet
    return (basePrice / 10) * quantity;
  }
  
  // Par défaut : utiliser une fraction conservatrice (assumer que c'est une petite portion)
  // Si la quantité est 1, utiliser le prix complet (peut-être que c'est déjà ajusté)
  if (quantity === 1) {
    return basePrice;
  }
  
  // Sinon, diviser par un facteur raisonnable
  return (basePrice / 10) * quantity;
}

