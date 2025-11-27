/**
 * Normalise une chaîne de caractères pour le matching
 * - Enlève les accents
 * - Met en minuscules
 * - Trim les espaces
 * - Enlève les caractères spéciaux superflus
 */
export function normalizeIngredientName(name: string): string {
  if (!name) return "";
  
  return name
    .toLowerCase()
    .trim()
    // Enlever les accents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Enlever les caractères spéciaux (garder lettres, chiffres, espaces)
    .replace(/[^a-z0-9\s]/g, " ")
    // Remplacer les espaces multiples par un seul
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Vérifie si deux noms d'ingrédients correspondent
 * Utilise un matching flexible (contains) après normalisation
 */
export function matchIngredients(
  ingredient1: string,
  ingredient2: string
): boolean {
  const normalized1 = normalizeIngredientName(ingredient1);
  const normalized2 = normalizeIngredientName(ingredient2);

  if (!normalized1 || !normalized2) return false;

  // Match exact après normalisation
  if (normalized1 === normalized2) return true;

  // Extraire les mots clés (séparer par espaces, filtrer les mots courts comme "de", "le", etc.)
  const stopWords = ['de', 'le', 'la', 'les', 'du', 'des', 'et', 'ou', 'the', 'of', 'and', 'or'];
  const words1 = normalized1.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w));
  const words2 = normalized2.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w));

  // Dictionnaire de traductions/variations communes
  const translations: { [key: string]: string[] } = {
    'papier': ['paper', 'tissue', 'hygienique', 'hygienic', 'toilet', 'toilettes'],
    'toilettes': ['toilet', 'bathroom', 'wc', 'hygienique', 'hygienic'],
    'toilette': ['toilet', 'bathroom', 'wc', 'hygienique', 'hygienic'],
    'hygienique': ['toilet', 'toilettes', 'toilette', 'hygienic', 'tissue', 'paper'],
    'parfum': ['perfume', 'fragrance', 'cologne', 'eau', 'eau de toilette'],
    'biere': ['beer', 'ale', 'lager', 'pilsner'],
    'bière': ['beer', 'ale', 'lager', 'pilsner'],
    'lait': ['milk', 'lait'],
    'pain': ['bread', 'loaf'],
    'fromage': ['cheese'],
    'beurre': ['butter'],
    'oeuf': ['egg', 'eggs'],
    'oeufs': ['egg', 'eggs'],
    'poulet': ['chicken'],
    'boeuf': ['beef'],
    'porc': ['pork'],
    'saumon': ['salmon'],
    'thon': ['tuna'],
    'pates': ['pasta', 'spaghetti', 'spaghettini', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'fusilli', 'rotini', 'macaroni', 'lasagna', 'ravioli', 'tortellini', 'gnocchi', 'cannelloni', 'ziti', 'farfalle', 'bowtie', 'angel hair', 'capellini', 'vermicelli', 'tagliatelle', 'pappardelle', 'orecchiette', 'cavatappi', 'gemelli', 'radiatore', 'campanelle', 'conchiglie', 'shells'],
    'pâtes': ['pasta', 'spaghetti', 'spaghettini', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'fusilli', 'rotini', 'macaroni', 'lasagna', 'ravioli', 'tortellini', 'gnocchi', 'cannelloni', 'ziti', 'farfalle', 'bowtie', 'angel hair', 'capellini', 'vermicelli', 'tagliatelle', 'pappardelle', 'orecchiette', 'cavatappi', 'gemelli', 'radiatore', 'campanelle', 'conchiglie', 'shells'],
    'pate': ['pasta', 'spaghetti', 'spaghettini', 'linguine', 'fettuccine', 'penne', 'rigatoni', 'fusilli', 'rotini', 'macaroni', 'lasagna', 'ravioli', 'tortellini', 'gnocchi', 'cannelloni', 'ziti', 'farfalle', 'bowtie', 'angel hair', 'capellini', 'vermicelli', 'tagliatelle', 'pappardelle', 'orecchiette', 'cavatappi', 'gemelli', 'radiatore', 'campanelle', 'conchiglie', 'shells'],
  };

  // Si au moins 2 mots correspondent, c'est un match
  if (words1.length > 0 && words2.length > 0) {
    const matchingWords = words1.filter(w1 => {
      // Vérifier le mot directement - mais être plus strict
      // Pour éviter "parfum" → "crevettes parfumées", on veut que le mot soit significatif
      const directMatch = words2.some(w2 => {
        // Match exact du mot complet (priorité)
        if (w1 === w2) return true;
        
        // Match partiel seulement si le mot fait au moins 5 caractères
        // et représente au moins 70% du mot le plus long
        if (w1.length >= 5 || w2.length >= 5) {
          const minLen = Math.min(w1.length, w2.length);
          const maxLen = Math.max(w1.length, w2.length);
          if (minLen >= 4 && (minLen / maxLen) >= 0.7) {
            return w1.includes(w2) || w2.includes(w1);
          }
        }
        
        // Pour les mots plus courts, exiger un match exact ou presque exact
        if (w1.length >= 4 && w2.length >= 4) {
          // Le mot le plus court doit représenter au moins 80% du plus long
          const minLen = Math.min(w1.length, w2.length);
          const maxLen = Math.max(w1.length, w2.length);
          if ((minLen / maxLen) >= 0.8) {
            return w1.includes(w2) || w2.includes(w1);
          }
        }
        
        return false;
      });
      if (directMatch) return true;
      
      // Vérifier les traductions
      const wordVariations = translations[w1] || [];
      const hasTranslation = wordVariations.some(translation => {
        // Match exact du mot de traduction
        if (words2.some(w2 => w2 === translation)) return true;
        
        // Pour les traductions, vérifier si un mot contient la traduction
        // Ex: "pates" → "spaghetti" devrait matcher "spaghetti bolognese"
        return words2.some(w2 => {
          // Match exact
          if (w2 === translation) return true;
          
          // Le mot de l'item contient la traduction (ex: "spaghetti" dans "spaghetti bolognese")
          // Assouplir : accepter même si la traduction fait 3+ caractères
          if (w2.includes(translation) && translation.length >= 3) return true;
          
          // La traduction contient le mot de l'item (ex: "pasta" contient "penne")
          // Assouplir : accepter même si le mot fait 3+ caractères
          if (translation.includes(w2) && w2.length >= 3) return true;
          
          return false;
        });
      });
      return hasTranslation;
    });
    
    // Pour "papier de toilettes" / "papier hygiénique", on veut que "papier" ET ("toilettes" OU "hygienique") correspondent
    // MAIS exclure "papier d'aluminium" et les produits de coloration capillaire
    const hasPapier = words1.includes('papier') || words2.includes('papier');
    const hasToiletteOrHygienique = matchingWords.some(w => 
      ['toilettes', 'toilette', 'hygienique', 'hygienic', 'toilet'].includes(w)
    );
    
    // Vérifier les faux positifs pour "papier de toilette"
    if (hasPapier && hasToiletteOrHygienique) {
      // Exclure "papier d'aluminium"
      const hasAluminium = normalized1.includes('aluminium') || normalized2.includes('aluminium') ||
                          normalized1.includes('aluminum') || normalized2.includes('aluminum') ||
                          normalized1.includes('foil') || normalized2.includes('foil');
      
      // Exclure les produits de coloration capillaire
      const hasHairColor = normalized1.includes('colour') || normalized2.includes('colour') ||
                           normalized1.includes('color') || normalized2.includes('color') ||
                           normalized1.includes('coloring') || normalized2.includes('coloring') ||
                           normalized1.includes('coloration') || normalized2.includes('coloration') ||
                           normalized1.includes('hair') || normalized2.includes('hair') ||
                           normalized1.includes('cheveux') || normalized2.includes('cheveux') ||
                           normalized1.includes('shimmering') || normalized2.includes('shimmering') ||
                           normalized1.includes('olia') || normalized2.includes('olia') ||
                           normalized1.includes('feria') || normalized2.includes('feria') ||
                           normalized1.includes('ammonia') || normalized2.includes('ammonia');
      
      // Si c'est un faux positif, ne pas matcher
      if (hasAluminium || hasHairColor) {
        return false;
      }
      
      // Sinon, c'est un bon match pour "papier de toilette"
      return true;
    }
    
    // Sinon, au moins 1 mot significatif doit correspondre
    const minMatches = words1.length >= 2 ? 1 : 1;
    if (matchingWords.length >= minMatches) {
      return true;
    }
  }

  // Match partiel (un contient l'autre) - mais seulement si c'est significatif
  // Éviter les faux positifs comme "papier" dans "papier de toilette" vs "huile d'olive"
  // OU "lait" dans "sans produit laitier" (négation)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    // Vérifier qu'il n'y a pas de négation (sans, non, etc.)
    const negationWords = ['sans', 'non', 'no', 'not', 'free', 'libre'];
    const hasNegation = negationWords.some(neg => 
      normalized1.includes(neg) || normalized2.includes(neg)
    );
    if (hasNegation) {
      // Si c'est une négation, être très strict - seulement si le mot est au début
      const startsWith = normalized1.startsWith(normalized2) || normalized2.startsWith(normalized1);
      if (!startsWith) {
        return false; // Éviter "lait" dans "sans produit laitier"
      }
    }
    
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    // Pour les mots courts mais significatifs (4-6 caractères), être plus permissif
    // Ex: "biere" (5 chars) devrait matcher "biere molson" ou "beer"
    if (minLength >= 4 && minLength <= 6) {
      // Si le mot court représente au moins 50% du mot long, c'est un match
      if ((minLength / maxLength) >= 0.5) {
        return true;
      }
    } else {
      // Pour les mots plus longs, être plus strict (60%)
      if (minLength >= 4 && (minLength / maxLength) >= 0.6) {
        return true;
      }
    }
  }

  // Match par mots clés communs - mais être plus strict
  // Au moins un mot complet doit correspondre (pas juste une partie)
  const exactWordMatches = words1.filter(w1 => 
    words2.some(w2 => w1 === w2 && w1.length >= 4)
  );
  if (exactWordMatches.length > 0) {
    return true;
  }
  
  // Pour les mots courts (3-4 caractères), exiger une correspondance exacte
  const shortWords1 = words1.filter(w => w.length >= 3 && w.length <= 4);
  const shortWords2 = words2.filter(w => w.length >= 3 && w.length <= 4);
  if (shortWords1.length > 0 && shortWords2.length > 0) {
    const shortMatch = shortWords1.some(w1 => shortWords2.includes(w1));
    if (shortMatch) {
      return true;
    }
  }

  // Vérifier les faux positifs spécifiques AVANT de retourner true
  // Ex: "pates" (pâtes) ne doit PAS matcher "pate" (pâté)
  const falsePositivePairs: { [key: string]: string[] } = {
    'pates': ['pate'], // "pâtes" ne doit pas matcher "pâté"
    'pâtes': ['pate'],
  };
  
  for (const [key, exclusions] of Object.entries(falsePositivePairs)) {
    if (normalized1.includes(key) || normalized2.includes(key)) {
      for (const exclusion of exclusions) {
        if (normalized1.includes(exclusion) || normalized2.includes(exclusion)) {
          // Si les deux contiennent le faux positif, c'est un match invalide
          // Ex: "pates" contient "pate" ET "pate tuna" contient "pate" = faux positif
          if (normalized1.includes(key) && normalized2.includes(exclusion)) {
            return false;
          }
          if (normalized2.includes(key) && normalized1.includes(exclusion)) {
            return false;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Trouve les matches entre une liste d'ingrédients et des items de flyer
 * Retourne un tableau de matches avec les détails
 */
export function findMatchesInFlyerItems(
  ingredients: string[],
  flyerItems: Array<{ name: string; [key: string]: any }>
): Array<{
  ingredient: string;
  matchedItem: any;
  matchScore: number;
}> {
  const matches: Array<{
    ingredient: string;
    matchedItem: any;
    matchScore: number;
  }> = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeIngredientName(ingredient);
    
    if (!normalizedIngredient || normalizedIngredient.length < 2) {
      console.log(`⚠️ [MATCHER] Ingrédient ignoré (trop court ou vide): "${ingredient}"`);
      continue;
    }

    let bestMatch: {
      ingredient: string;
      matchedItem: any;
      matchScore: number;
    } | null = null;
    let bestScore = 0;

    for (const item of flyerItems) {
      const itemName = item.name || "";
      if (!itemName) continue;
      
      const normalizedItemName = normalizeIngredientName(itemName);

      if (matchIngredients(normalizedIngredient, normalizedItemName)) {
        // Vérifier les faux positifs courants
        const ingredientWord = normalizedIngredient.split(/\s+/)[0]; // Premier mot de l'ingrédient
        
        // Liste de mots qui peuvent causer des faux positifs
        const falsePositivePatterns: { [key: string]: string[] } = {
          'lait': ['yogourt', 'yogurt', 'coco', 'coconut', 'soja', 'soy', 'amande', 'almond', 'avoine', 'oat'],
          'pain': ['fruit', 'fruits', 'cassave', 'cassava', 'pita', 'naan', 'tortilla'],
          'fromage': ['cream', 'creme', 'cheese'],
          'beurre': ['peanut', 'arachide', 'cacahuete'],
          'parfum': ['crevette', 'crevettes', 'shrimp', 'poisson', 'fish', 'fruits de mer', 'seafood'],
          'pates': ['pate', 'spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'pâtes': ['pate', 'spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'pate': ['spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'papier': ['aluminium', 'aluminum', 'foil', 'wax', 'cire', 'parchemin', 'parchment', 'sulfurise', 'sulfurized'],
          'toilette': ['colour', 'color', 'coloring', 'coloration', 'hair', 'cheveux', 'shimmering', 'olia', 'feria', 'ammonia', 'ammoniaque'],
          'toilettes': ['colour', 'color', 'coloring', 'coloration', 'hair', 'cheveux', 'shimmering', 'olia', 'feria', 'ammonia', 'ammoniaque'],
        };
        
        // Vérifier si c'est un faux positif
        const patterns = falsePositivePatterns[ingredientWord];
        if (patterns) {
          const isFalsePositive = patterns.some(pattern => 
            normalizedItemName.includes(pattern) && !normalizedItemName.includes(ingredientWord)
          );
          if (isFalsePositive) {
            console.log(`⚠️ [MATCHER] Faux positif évité: "${ingredient}" → "${itemName}"`);
            continue;
          }
        }
        
        // Calculer un score de match (plus le match est exact, plus le score est élevé)
        let matchScore = 0;
        if (normalizedIngredient === normalizedItemName) {
          matchScore = 100; // Match exact
        } else if (normalizedItemName.includes(normalizedIngredient)) {
          // L'item contient l'ingrédient complet
          const ingredientWords = normalizedIngredient.split(/\s+/).filter(w => w.length >= 2);
          
          // Pour les ingrédients d'un seul mot (ex: "biere"), être plus permissif
          if (ingredientWords.length === 1) {
            const word = ingredientWords[0];
            // Si le mot fait au moins 4 caractères, c'est un bon match
            if (word.length >= 4) {
              matchScore = 80;
            } else if (word.length >= 3) {
              matchScore = 60; // Mots de 3 caractères acceptés mais score plus bas
            }
          } else {
            // Pour plusieurs mots, vérifier que tous les mots significatifs matchent
            // Assouplir : accepter si au moins un mot significatif (4+ chars) matche
            const significantWords = ingredientWords.filter(w => w.length >= 4);
            if (significantWords.length > 0) {
              const matchingSignificantWords = significantWords.filter(word => 
                normalizedItemName.includes(word)
              );
              // Si au moins un mot significatif matche, c'est un bon match
              matchScore = matchingSignificantWords.length > 0 ? 70 : 50;
            } else {
              // Si pas de mots significatifs, vérifier tous les mots
              const allWordsMatch = ingredientWords.every(word => 
                normalizedItemName.includes(word)
              );
              matchScore = allWordsMatch ? 60 : 45;
            }
          }
        } else if (normalizedIngredient.includes(normalizedItemName)) {
          matchScore = 60; // L'ingrédient contient l'item
        } else {
          // Match partiel - vérifier les mots communs
          const ingredientWords = normalizedIngredient.split(/\s+/).filter(w => w.length >= 3);
          const itemWords = normalizedItemName.split(/\s+/).filter(w => w.length >= 3);
          
          // Trouver les mots communs
          const commonWords = ingredientWords.filter(w1 => 
            itemWords.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))
          );
          
          // Pour un seul mot dans l'ingrédient, accepter si le mot matche
          if (ingredientWords.length === 1 && commonWords.length >= 1) {
            matchScore = 50; // Match partiel acceptable pour un seul mot
          } else if (commonWords.length >= 2) {
            matchScore = 40; // Match partiel avec 2+ mots communs
          } else if (commonWords.length === 1 && ingredientWords.length === 1) {
            // Un seul mot qui matche partiellement - accepter si le mot fait au moins 3 chars (assoupli)
            const word = ingredientWords[0];
            if (word.length >= 3) {
              matchScore = 45;
            }
          } else if (commonWords.length >= 1) {
            // Au moins un mot commun - accepter avec un score plus bas
            matchScore = 40;
          }
        }
        
        // Ne pas accepter les scores trop bas (sauf pour les mots courts significatifs)
        if (matchScore < 40) {
          continue;
        }

        // Garder le meilleur match pour cet ingrédient
        if (matchScore > bestScore) {
          bestMatch = {
            ingredient,
            matchedItem: item,
            matchScore,
          };
          bestScore = matchScore;
        }
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      console.log(`✅ [MATCHER] Match trouvé: "${ingredient}" → "${bestMatch.matchedItem.name}" (score: ${bestScore})`);
    } else {
      console.log(`❌ [MATCHER] Aucun match pour: "${ingredient}" (normalisé: "${normalizedIngredient}")`);
    }
  }

  // Trier par score décroissant
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

