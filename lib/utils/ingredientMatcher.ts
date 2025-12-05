import { logger } from "./logger";

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
 * Utilise un matching STRICT pour éviter les faux positifs (ex: "crème" → "crème sure", "pomme" → "compote de pomme")
 * 
 * RÈGLES STRICTES :
 * - Le terme recherché doit être un mot complet (pas juste une partie d'un mot)
 * - Exclut les variations dérivées (ex: "crémeux" quand on cherche "crème")
 * - Exclut les composés (ex: "compote de pomme" quand on cherche "pomme")
 */
export function matchIngredients(
  ingredient1: string,
  ingredient2: string
): boolean {
  const normalized1 = normalizeIngredientName(ingredient1);
  const normalized2 = normalizeIngredientName(ingredient2);

  if (!normalized1 || !normalized2) return false;
  
  // Liste des mots d'emballage à exclure
  const packagingWords = ['piece', 'pieces', 'set', 'sets', 'pack', 'packs', 'packet', 'packets', 'box', 'boxes', 
                          'bag', 'bags', 'bottle', 'bottles', 'can', 'cans', 'jar', 'jars', 'container', 'containers',
                          'unit', 'units', 'item', 'items', 'pcs', 'pc', 'ct', 'count', 'counts', 'pkg', 'pkgs',
                          'blender', 'cookware', 'luggage', 'valise', 'knife', 'paint', 'gum', 'nicotine'];
  
  // 🎯 RECHERCHE STRICTE : Vérifier que le terme recherché est un MOT COMPLET
  // Extraire les mots significatifs (filtrer les stop words et mots génériques d'emballage)
  const stopWords = ['de', 'le', 'la', 'les', 'du', 'des', 'et', 'ou', 'the', 'of', 'and', 'or', 'a', 'an', 'en', 'au', 'aux'];
  
  // Extraire les mots significatifs (filtrer stop words et packaging words)
  const words1 = normalized1.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w) && !packagingWords.includes(w));
  const words2 = normalized2.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w) && !packagingWords.includes(w));
  
  // Si l'ingrédient recherché ne contient que des mots d'emballage, c'est invalide
  if (words1.length === 0) {
    return false;
  }
  
  // Si le produit ne contient que des mots d'emballage, exclure
  if (words2.length === 0) {
    return false;
  }

  // Match exact après normalisation (mais seulement si ce n'est pas juste des mots d'emballage)
  if (normalized1 === normalized2 && words1.length > 0 && words2.length > 0) {
    return true;
  }
  
  // Si l'ingrédient recherché est un seul mot, être TRÈS strict
  if (words1.length === 1) {
    const searchWord = words1[0];
    
    // Exclure si le mot recherché est un mot d'emballage
    if (packagingWords.includes(searchWord)) {
      return false;
    }
    
    // 🎯 RÈGLE STRICTE POUR MOTS SIMPLES :
    // Pour un mot simple (ex: "mais"), on accepte seulement :
    // 1. Le produit est exactement ce mot (ex: "mais" === "mais")
    // 2. Le produit commence par ce mot suivi d'un espace (ex: "mais en conserve" ✅, mais "mais soufflé" ❌)
    // 3. Le produit est ce mot seul (sans autres mots significatifs)
    
    // Cas 1: Match exact
    if (normalized1 === normalized2) {
      return true;
    }
    
    // Cas 2: Le produit commence par le mot recherché suivi d'un espace
    // Pour un mot simple, être ULTRA-STRICT : accepter seulement si le reste ne contient PAS de mots de composition
    // Ex: "beurre" → "beurre selection" ✅ mais PAS "beurre d'arachide" ❌
    if (normalized2.startsWith(searchWord + ' ')) {
      const afterWord = normalized2.substring(searchWord.length + 1).trim();
      
      // 🎯 LISTE GÉNÉRALE DE MOTS DE COMPOSITION : exclure TOUS les produits composés
      // Ces mots indiquent que le produit est un composé (ex: "beurre D'ARACHIDE", "beurre DE POMME")
      const compositionWords = [
        // Prépositions + ingrédients (français)
        'darachide', 'd arachide', 'de arachide', 'de cacahuete', 'de cacahuète',
        'damande', 'd amande', 'de amande', 'de noix', 'de noisette', 'de sesame',
        'de coco', 'de cocos', 'de pomme', 'de pommes', 'de poire', 'de poires',
        'de citron', 'de citrons', 'de fraise', 'de fraises', 'de banane', 'de bananes',
        'de canne', 'de cannes', 'de soja', 'de sojas', 'davoine', 'd avoine', 'de avoine',
        // Prépositions + ingrédients (anglais)
        'peanut', 'almond', 'nut', 'hazelnut', 'coconut', 'apple', 'apples',
        'cane', 'soy', 'oat', 'sesame',
        // Mots composés directs
        'butter', 'spread', 'tartinade',
      ];
      
      // Vérifier si le reste contient un mot de composition
      const hasCompositionWord = compositionWords.some(compWord => {
        // Vérifier si le mot de composition est présent comme mot complet ou partie d'un mot
        const compRegex = new RegExp(`\\b${compWord}\\b|${compWord}`, 'i');
        return compRegex.test(afterWord);
      });
      
      if (hasCompositionWord) {
        return false; // Produit composé, pas l'ingrédient simple
      }
      
      // Vérifier les exclusions spécifiques AVANT d'accepter
      // Exclusions pour "mais" / "maïs" : exclure "mais soufflé", "popcorn", etc.
      if (searchWord === 'mais' || searchWord === 'mais' || searchWord === 'corn') {
        const excludedPatterns = ['souffle', 'soufflé', 'popcorn', 'pop corn', 'eclate', 'éclaté', 'orville'];
        if (excludedPatterns.some(pattern => afterWord.includes(pattern))) {
          return false; // Produit transformé (popcorn), pas du maïs simple
        }
      }
      
      // Exclusions pour "sucre" : exclure "sucre à glacer", "sucre brun", "cassonade", etc.
      if (searchWord === 'sucre' || searchWord === 'sugar') {
        const excludedPatterns = ['a glacer', 'à glacer', 'glacer', 'glace', 'glacee', 'icing',
                                  'brun', 'brown', 'cassonade', 'demerara', 'turbinado',
                                  'de canne', 'cane', 'de coco', 'coconut'];
        if (excludedPatterns.some(pattern => afterWord.includes(pattern))) {
          return false; // Type spécifique de sucre, pas du sucre simple
        }
      }
      
      // Exclusions spécifiques pour "beurre" : exclure TOUS les beurres composés
      if (searchWord === 'beurre' || searchWord === 'butter') {
        const excludedButterPatterns = [
          'darachide', 'd arachide', 'de arachide', 'peanut',
          'damande', 'd amande', 'de amande', 'almond',
          'de noix', 'de noisette', 'nut', 'hazelnut',
          'de coco', 'coconut',
          'de sesame', 'sesame', 'tahini',
          'de pomme', 'de pommes', 'apple', 'apples',
          'de poire', 'de poires', 'pear', 'pears',
          'butter', 'spread', 'tartinade', // Mots qui indiquent un beurre composé
        ];
        if (excludedButterPatterns.some(pattern => afterWord.includes(pattern))) {
          return false; // Beurre composé, pas du beurre simple
        }
      }
      
      // Liste générale de mots qui indiquent un produit transformé/composé à exclure
      const transformationWords = ['souffle', 'soufflé', 'popcorn', 'eclate', 'éclaté', 
                                   'cuit', 'grille', 'grillé', 'frit', 'frite', 'seche', 'séché',
                                   'moulu', 'hache', 'haché', 'mixte', 'prepare', 'préparé'];
      
      // Si le mot suivant indique une transformation, exclure
      const nextWord = afterWord.split(/\s+/)[0];
      if (transformationWords.includes(nextWord)) {
        return false; // Produit transformé, pas l'ingrédient simple
      }
      
      return true; // ✅ Le produit commence par le mot recherché et n'est pas un composé/transformé
    }
    
    // Cas 3: Le produit contient le mot mais il faut vérifier qu'il n'est pas dans un composé
    const wordBoundaryRegex = new RegExp(`\\b${searchWord}\\b`, 'i');
    const hasExactWord = wordBoundaryRegex.test(normalized2);
    
    if (hasExactWord) {
      // Vérifier que le produit ne contient PAS uniquement des mots d'emballage
      const productWords = normalized2.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w));
      const productWordsOnly = productWords.filter(w => !packagingWords.includes(w));
      
      // Si le produit ne contient que des mots d'emballage (pas d'ingrédient réel), exclure
      if (productWordsOnly.length === 0) {
        return false;
      }
      
      // Pour un mot simple, être TRÈS strict : le produit doit être exactement ce mot
      // OU le produit doit commencer par ce mot (pas le contenir au milieu)
      if (productWordsOnly.length > 1) {
        // Si le produit a plusieurs mots, vérifier que le mot recherché est le PREMIER mot
        if (productWordsOnly[0] !== searchWord) {
          return false; // Le mot recherché n'est pas le premier mot, c'est probablement un composé
        }
      } else if (productWordsOnly[0] !== searchWord) {
        return false; // Le seul mot du produit n'est pas exactement le mot recherché
      }
      
      // ✅ Le mot est présent comme mot complet et est le premier mot ou le seul mot
      // MAIS vérifier les exclusions spécifiques pour éviter les faux positifs
      
      // Exclusions pour "crème" : exclure "crème sure", "crémeux", "crème glacée", etc.
      if (searchWord === 'creme' || searchWord === 'crème') {
        const excludedPatterns = ['creme sure', 'creme glacee', 'creme glace', 'creme fouettee', 'creme fouette', 
                                  'cremeux', 'cremeuse', 'yogourt cremeux', 'yogurt cremeux', 'yogourt cremeuse', 'yogurt cremeuse',
                                  'fromage creme', 'cream cheese', 'sour cream', 'whipped cream'];
        const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
        if (isExcluded) {
          return false; // Exclure les variations de "crème"
        }
      }
      
      // Exclusions pour "pomme" : exclure "compote de pomme", "jus de pomme", etc.
      if (searchWord === 'pomme' || searchWord === 'apple') {
        const excludedPatterns = ['compote', 'compote de pomme', 'apple sauce', 'jus de pomme', 'apple juice',
                                  'croustade', 'tarte aux pommes', 'apple pie', 'pomme de terre', 'potato'];
        const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
        if (isExcluded && !normalized2.startsWith('pomme') && !normalized2.startsWith('apple')) {
          // Accepter seulement si "pomme" est le premier mot (ex: "pomme gala", "apple red")
          return false; // Exclure les composés avec "pomme"
        }
      }
      
      // Exclusions pour "lait" : exclure "lait de coco", "lait d'amande", etc. (sauf si c'est explicitement "lait")
      if (searchWord === 'lait' || searchWord === 'milk') {
        const excludedPatterns = ['lait de coco', 'coconut milk', 'lait damande', 'almond milk', 
                                  'lait de soja', 'soy milk', 'lait davoine', 'oat milk',
                                  'laitue', 'lettuce']; // Éviter "lait" dans "laitue"
        const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
        if (isExcluded && !normalized2.startsWith('lait') && !normalized2.startsWith('milk')) {
          return false; // Exclure les laits végétaux sauf si "lait" est le premier mot
        }
      }
      
      // Exclusions pour "beurre" : exclure "beurre d'arachide", "beurre de cacahuète", etc.
      // Pour un mot simple, être ULTRA-STRICT : exclure TOUS les beurres composés
      if (searchWord === 'beurre' || searchWord === 'butter') {
        const excludedButterPatterns = [
          'darachide', 'd arachide', 'de arachide', 'peanut butter', 'peanut',
          'damande', 'd amande', 'de amande', 'almond butter', 'almond',
          'de noix', 'de noisette', 'nut butter', 'nut', 'hazelnut',
          'de coco', 'coconut butter', 'coconut',
          'de sesame', 'sesame', 'tahini',
          'de pomme', 'de pommes', 'apple butter', 'apple', 'apples',
          'de poire', 'de poires', 'pear butter', 'pear', 'pears',
          'butter', 'spread', 'tartinade', // Mots qui indiquent un beurre composé
        ];
        const isExcluded = excludedButterPatterns.some(pattern => {
          // Vérifier si le pattern est présent dans le nom du produit
          const patternRegex = new RegExp(`\\b${pattern}\\b|${pattern}`, 'i');
          return patternRegex.test(normalized2);
        });
        if (isExcluded) {
          return false; // Beurre composé, pas du beurre simple
        }
      }
      
      // Exclusions pour "sucre" : exclure "sucre à glacer", "cassonade", "boissons zéro sucre", etc.
      if (searchWord === 'sucre' || searchWord === 'sugar') {
        // Exclure les boissons (même si "sucre" est présent, ce n'est pas du sucre)
        const drinkKeywords = ['boissons', 'boisson', 'drink', 'drinks', 'minute maid', 'coca cola', 'pepsi', 'soda', 'soft drink', 'beverage'];
        if (drinkKeywords.some(keyword => normalized2.includes(keyword))) {
          return false; // C'est une boisson, pas du sucre
        }
        
        const excludedPatterns = [
          'sucre a glacer', 'sucre à glacer', 'icing sugar', 'sucre glace', 'sucre glacee',
          'cassonade', 'brown sugar', 'sucre brun',
          'zero sugar', 'zero sucre', 'sans sucre', 'sugar free',
          'sucre dans', 'sugar in', 'avec sucre', 'with sugar',
          'sucre de canne', 'cane sugar', 'sucre de coco', 'coconut sugar',
          'sucre demerara', 'demerara sugar', 'sucre turbinado', 'turbinado sugar'
        ];
        const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
        if (isExcluded) {
          // Accepter seulement si "sucre" est le premier mot ET que ce n'est pas un type spécifique exclu
          // Ex: "sucre blanc" ✅ mais "sucre à glacer" ❌
          if (normalized2.startsWith('sucre a glacer') || normalized2.startsWith('sucre à glacer') || 
              normalized2.startsWith('icing sugar') || normalized2.startsWith('cassonade') ||
              normalized2.startsWith('brown sugar')) {
            return false; // Exclure les types spécifiques de sucre
          }
        }
      }
      
      // Exclusions pour "mais" / "maïs" : exclure "mais soufflé", "popcorn", etc.
      if (searchWord === 'mais' || searchWord === 'mais' || searchWord === 'corn') {
        const excludedPatterns = ['mais souffle', 'mais soufflé', 'popcorn', 'pop corn', 'mais eclate', 'mais éclaté',
                                  'mais souffle', 'orville', 'corn souffle', 'corn soufflé', 'souffle', 'soufflé'];
        const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
        if (isExcluded) {
          return false; // Exclure les produits transformés à base de maïs
        }
      }
      
      // Exclusions pour "fecule" / "fécule" : exclure les produits transformés
      if (searchWord === 'fecule' || searchWord === 'fécule' || searchWord === 'starch') {
        // Si le produit contient "mais" mais aussi "souffle" ou "popcorn", c'est un faux positif
        if (normalized2.includes('mais') || normalized2.includes('corn')) {
          const excludedPatterns = ['souffle', 'soufflé', 'popcorn', 'pop corn', 'eclate', 'éclaté'];
          const isExcluded = excludedPatterns.some(pattern => normalized2.includes(pattern));
          if (isExcluded) {
            return false; // Exclure "mais soufflé" quand on cherche "fécule de maïs"
          }
        }
      }
      
      return true; // ✅ Match valide
    }
    
    // Si le mot n'est pas présent comme mot complet, vérifier les traductions
    // (mais toujours avec des limites strictes)
    const translations: { [key: string]: string[] } = {
      'lait': ['milk'],
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
      'gingembre': ['ginger'],
    };
    
    const wordVariations = translations[searchWord] || [];
    for (const translation of wordVariations) {
      const translationRegex = new RegExp(`\\b${translation}\\b`, 'i');
      if (translationRegex.test(normalized2)) {
        // Pour "beurre" / "butter", vérifier qu'on n'a pas "peanut butter" ou autres beurres de noix
        if ((searchWord === 'beurre' || searchWord === 'butter') && translation === 'butter') {
          const excludedButterPatterns = ['peanut butter', 'almond butter', 'nut butter', 'coconut butter', 'tahini'];
          const isExcludedButter = excludedButterPatterns.some(pattern => normalized2.includes(pattern));
          if (isExcludedButter) {
            continue; // Ignorer ce match, ce n'est pas du beurre classique
          }
        }
        return true; // ✅ Match via traduction
      }
    }
    
    // Pas de match strict trouvé
    return false;
  }

  // Pour les ingrédients multi-mots, utiliser une logique plus flexible mais toujours stricte
  // Réutiliser les mots déjà extraits (words1 et words2 sont déjà définis plus haut avec filtrage)
  
  // Vérifier que le produit ne contient pas uniquement des mots d'emballage
  // words2 est déjà filtré (ligne 76), donc on peut l'utiliser directement
  if (words2.length === 0) {
    return false; // Le produit ne contient que des mots d'emballage, pas un vrai ingrédient
  }
  
  // Vérifier que l'ingrédient recherché (sans mots d'emballage) est vraiment présent dans le produit
  if (words1.length === 0) {
    return false; // L'ingrédient recherché ne contient que des mots d'emballage
  }

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
    ) || normalized1.includes('toilette') || normalized1.includes('toilettes') || 
        normalized1.includes('hygienique') || normalized1.includes('hygienic') ||
        normalized2.includes('toilette') || normalized2.includes('toilettes') ||
        normalized2.includes('hygienique') || normalized2.includes('hygienic');
    
    // Vérifier les faux positifs pour "papier de toilette"
    if (hasPapier && hasToiletteOrHygienique) {
      // Exclure "papier d'aluminium" - vérifier si l'un contient aluminium et l'autre toilette
      const hasAluminium = normalized1.includes('aluminium') || normalized2.includes('aluminium') ||
                          normalized1.includes('aluminum') || normalized2.includes('aluminum') ||
                          normalized1.includes('foil') || normalized2.includes('foil');
      
      // Si l'un contient "papier" + "aluminium" et l'autre contient "papier" + "toilette/hygiénique", c'est un faux positif
      const oneHasAluminium = normalized1.includes('aluminium') || normalized1.includes('aluminum') || normalized1.includes('foil');
      const oneHasToilette = normalized1.includes('toilette') || normalized1.includes('toilettes') || 
                            normalized1.includes('hygienique') || normalized1.includes('hygienic');
      const twoHasAluminium = normalized2.includes('aluminium') || normalized2.includes('aluminum') || normalized2.includes('foil');
      const twoHasToilette = normalized2.includes('toilette') || normalized2.includes('toilettes') || 
                            normalized2.includes('hygienique') || normalized2.includes('hygienic');
      
      // Si l'un a aluminium et l'autre a toilette, c'est un faux positif
      if ((oneHasAluminium && twoHasToilette) || (oneHasToilette && twoHasAluminium)) {
        return false;
      }
      
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
    
    // Vérifier aussi le cas inverse : si l'un contient "papier" + "aluminium" et l'autre contient "papier" + "toilette/hygiénique"
    // C'est un faux positif qu'il faut exclure
    if (hasPapier) {
      const oneHasAluminium = normalized1.includes('aluminium') || normalized1.includes('aluminum') || normalized1.includes('foil');
      const oneHasToilette = normalized1.includes('toilette') || normalized1.includes('toilettes') || 
                            normalized1.includes('hygienique') || normalized1.includes('hygienic');
      const twoHasAluminium = normalized2.includes('aluminium') || normalized2.includes('aluminum') || normalized2.includes('foil');
      const twoHasToilette = normalized2.includes('toilette') || normalized2.includes('toilettes') || 
                            normalized2.includes('hygienique') || normalized2.includes('hygienic');
      
      // Si l'un a aluminium et l'autre a toilette, c'est un faux positif
      if ((oneHasAluminium && twoHasToilette) || (oneHasToilette && twoHasAluminium)) {
        return false;
      }
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
  // Ex: "papier de toilette" ne doit PAS matcher "papier d'aluminium"
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
  
  // Vérification spécifique pour papier de toilette vs papier d'aluminium
  // Si l'un contient "papier" + "toilette/hygiénique" et l'autre contient "papier" + "aluminium/foil"
  const oneHasPapierToilette = (normalized1.includes('papier') && 
                                (normalized1.includes('toilette') || normalized1.includes('toilettes') || 
                                 normalized1.includes('hygienique') || normalized1.includes('hygienic'))) ||
                               (normalized2.includes('papier') && 
                                (normalized2.includes('toilette') || normalized2.includes('toilettes') || 
                                 normalized2.includes('hygienique') || normalized2.includes('hygienic')));
  
  const oneHasPapierAluminium = (normalized1.includes('papier') && 
                                  (normalized1.includes('aluminium') || normalized1.includes('aluminum') || 
                                   normalized1.includes('foil'))) ||
                                 (normalized2.includes('papier') && 
                                  (normalized2.includes('aluminium') || normalized2.includes('aluminum') || 
                                   normalized2.includes('foil')));
  
  if (oneHasPapierToilette && oneHasPapierAluminium) {
    // Vérifier que ce n'est pas le même texte (ce qui serait un vrai match)
    if (normalized1 !== normalized2) {
      return false; // Faux positif : papier de toilette vs papier d'aluminium
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
      logger.debug(`Ingrédient ignoré (trop court ou vide): "${ingredient}"`, { ingredient });
      continue;
    }

    // Retourner TOUS les matches pour cet ingrédient (pas seulement le meilleur)
    // Cela permet d'afficher plusieurs rabais du même item dans différents supermarchés
    const ingredientMatches: Array<{
      ingredient: string;
      matchedItem: any;
      matchScore: number;
    }> = [];

    // 🎯 NOUVELLE LOGIQUE STRICTE : Extraire tous les mots significatifs de l'ingrédient
    const stopWords = ['de', 'le', 'la', 'les', 'du', 'des', 'et', 'ou', 'the', 'of', 'and', 'or', 'a', 'an', 'en', 'au', 'aux', 'a', 'c'];
    const packagingWords = ['piece', 'pieces', 'set', 'sets', 'pack', 'packs', 'packet', 'packets', 'box', 'boxes', 
                            'bag', 'bags', 'bottle', 'bottles', 'can', 'cans', 'jar', 'jars', 'container', 'containers',
                            'unit', 'units', 'item', 'items', 'pcs', 'pc', 'ct', 'count', 'counts', 'pkg', 'pkgs'];
    
    // Extraire les mots significatifs de l'ingrédient (exclure stop words et packaging words)
    const ingredientSignificantWords = normalizedIngredient
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.includes(w) && !packagingWords.includes(w));
    
    // Si l'ingrédient n'a pas de mots significatifs, ignorer
    if (ingredientSignificantWords.length === 0) {
      logger.debug(`Ingrédient ignoré (pas de mots significatifs): "${ingredient}"`, { ingredient });
      continue;
    }

    for (const item of flyerItems) {
      const itemName = item.name || "";
      if (!itemName) continue;
      
      const normalizedItemName = normalizeIngredientName(itemName);
      
      // 🎯 VÉRIFICATION STRICTE PRINCIPALE : TOUS les mots significatifs doivent être présents dans le produit
      // Cette logique s'applique à TOUS les ingrédients sans exception
      const allWordsPresent = ingredientSignificantWords.every(word => {
        // Vérifier que le mot est présent comme mot complet (boundary) - pas juste une partie d'un mot
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        return wordRegex.test(normalizedItemName);
      });
      
      // Si tous les mots ne sont pas présents, ignorer ce produit immédiatement
      // C'est la condition PRINCIPALE qui s'applique à TOUS les ingrédients
      if (!allWordsPresent) {
        continue;
      }
      
      // Maintenant que tous les mots sont présents, vérifier les exclusions spécifiques
      // On utilise matchIngredients seulement pour les règles d'exclusion, pas pour le matching de base
      // car le matching de base est déjà fait par la vérification stricte ci-dessus
      if (matchIngredients(normalizedIngredient, normalizedItemName)) {
        // Vérifier les faux positifs courants
        const ingredientWord = normalizedIngredient.split(/\s+/)[0]; // Premier mot de l'ingrédient
        
        // Liste de mots qui peuvent causer des faux positifs
        const falsePositivePatterns: { [key: string]: string[] } = {
          'lait': ['yogourt', 'yogurt', 'coco', 'coconut', 'soja', 'soy', 'amande', 'almond', 'avoine', 'oat'],
          'pain': ['fruit', 'fruits', 'cassave', 'cassava', 'pita', 'naan', 'tortilla'],
          'fromage': ['cream', 'creme', 'cheese'],
          'beurre': [
            // Beurres de noix et composés
            'peanut', 'arachide', 'cacahuete', 'cacahuète', 'almond', 'amande', 'damande', 'd amande', 'de amande',
            'nut', 'noix', 'noisette', 'hazelnut', 'coconut', 'coco', 'de coco',
            'sesame', 'tahini', 'de sesame',
            // Beurres de fruits
            'apple', 'pomme', 'de pomme', 'de pommes', 'pear', 'poire', 'de poire', 'de poires',
            // Mots indicateurs de composé
            'butter', 'spread', 'tartinade', 'darachide', 'd arachide', 'de arachide',
          ],
          'parfum': ['crevette', 'crevettes', 'shrimp', 'poisson', 'fish', 'fruits de mer', 'seafood'],
          'pates': ['pate', 'spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'pâtes': ['pate', 'spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'pate': ['spread', 'tuna', 'salmon', 'pink', 'chicken', 'liver', 'foie'],
          'papier': ['aluminium', 'aluminum', 'foil', 'wax', 'cire', 'parchemin', 'parchment', 'sulfurise', 'sulfurized'],
          'toilette': ['colour', 'color', 'coloring', 'coloration', 'hair', 'cheveux', 'shimmering', 'olia', 'feria', 'ammonia', 'ammoniaque'],
          'toilettes': ['colour', 'color', 'coloring', 'coloration', 'hair', 'cheveux', 'shimmering', 'olia', 'feria', 'ammonia', 'ammoniaque'],
          'mais': ['souffle', 'soufflé', 'popcorn', 'eclate', 'éclaté', 'orville', 'corn souffle'],
          'maïs': ['souffle', 'soufflé', 'popcorn', 'eclate', 'éclaté', 'orville', 'corn souffle'],
          'fecule': ['souffle', 'soufflé', 'popcorn', 'eclate', 'éclaté'],
        };
        
        // Vérifier si c'est un faux positif
        const patterns = falsePositivePatterns[ingredientWord];
        if (patterns) {
          // Pour "papier", vérifier spécifiquement si l'ingrédient est "papier de toilette/hygiénique"
          // et si l'item contient "aluminium" ou autres faux positifs
          if (ingredientWord === 'papier') {
            const isToiletPaper = normalizedIngredient.includes('toilette') || 
                                  normalizedIngredient.includes('toilettes') ||
                                  normalizedIngredient.includes('hygienique') ||
                                  normalizedIngredient.includes('hygienic');
            
            if (isToiletPaper) {
              // Si c'est du papier de toilette, exclure les items avec aluminium/foil/etc
              const hasFalsePositive = patterns.some(pattern => 
                normalizedItemName.includes(pattern)
              );
              if (hasFalsePositive) {
                logger.debug(`Faux positif évité: "${ingredient}" → "${itemName}" (papier de toilette vs papier d'aluminium)`, { ingredient, itemName });
                continue;
              }
            } else {
              // Si ce n'est pas du papier de toilette, utiliser la logique normale
              const isFalsePositive = patterns.some(pattern => 
                normalizedItemName.includes(pattern) && !normalizedItemName.includes(ingredientWord)
              );
              if (isFalsePositive) {
                logger.debug(`Faux positif évité: "${ingredient}" → "${itemName}"`, { ingredient, itemName });
                continue;
              }
            }
          } else if (ingredientWord === 'fecule' || ingredientWord === 'fécule') {
            // Pour "fécule de maïs", exclure les produits transformés (maïs soufflé, popcorn, etc.)
            const hasMais = normalizedItemName.includes('mais') || normalizedItemName.includes('corn');
            const hasExcludedPattern = patterns.some(pattern => normalizedItemName.includes(pattern));
            
            // Si le produit contient "mais" ET un pattern exclu (soufflé, popcorn, etc.), c'est un faux positif
            // Ex: "mais soufflé" ne doit pas matcher "fécule de maïs"
            if (hasMais && hasExcludedPattern) {
              logger.debug(`Faux positif évité: "${ingredient}" → "${itemName}" (fécule de maïs vs maïs soufflé)`, { ingredient, itemName });
              continue;
            }
          } else if (ingredientWord === 'mais' || ingredientWord === 'maïs') {
            // Pour "maïs" seul, exclure les produits transformés
            const hasExcludedPattern = patterns.some(pattern => normalizedItemName.includes(pattern));
            if (hasExcludedPattern) {
              logger.debug(`Faux positif évité: "${ingredient}" → "${itemName}" (maïs vs maïs soufflé)`, { ingredient, itemName });
              continue;
            }
          } else {
            // Pour les autres mots, utiliser la logique normale
            const isFalsePositive = patterns.some(pattern => 
              normalizedItemName.includes(pattern) && !normalizedItemName.includes(ingredientWord)
            );
            if (isFalsePositive) {
              logger.debug(`Faux positif évité: "${ingredient}" → "${itemName}"`, { ingredient, itemName });
              continue;
            }
          }
        }
        
        // Calculer un score de match (plus le match est exact, plus le score est élevé)
        let matchScore = 0;
        if (normalizedIngredient === normalizedItemName) {
          matchScore = 100; // Match exact
        } else if (normalizedItemName.includes(normalizedIngredient)) {
          // L'item contient l'ingrédient complet
          matchScore = 90; // Tous les mots sont présents et l'item contient l'ingrédient complet
        } else if (normalizedIngredient.includes(normalizedItemName)) {
          matchScore = 80; // L'ingrédient contient l'item (moins probable mais possible)
        } else {
          // Tous les mots significatifs sont présents mais l'ordre/format diffère
          matchScore = 85; // Bon match car tous les mots sont présents
        }

        // Ajouter TOUS les matches qui passent le seuil (pas seulement le meilleur)
        // Cela permet d'afficher plusieurs rabais du même item dans différents supermarchés
        ingredientMatches.push({
          ingredient,
          matchedItem: item,
          matchScore,
        });
      }
    }

    // Ajouter tous les matches trouvés pour cet ingrédient
    if (ingredientMatches.length > 0) {
      matches.push(...ingredientMatches);
      logger.debug(`${ingredientMatches.length} match(s) trouvé(s) pour "${ingredient}"`, { 
        ingredient, 
        matchesCount: ingredientMatches.length,
        matches: ingredientMatches.map(m => ({
          item: m.matchedItem.name,
          score: m.matchScore
        }))
      });
    } else {
      logger.debug(`Aucun match pour: "${ingredient}"`, { 
        ingredient, 
        normalizedIngredient 
      });
    }
  }

  // Trier par score décroissant
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

