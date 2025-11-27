/**
 * Extrait le nombre de portions depuis un texte (titre ou snippet de recette)
 * Utilisé pour l'estimation rapide sans avoir besoin de parser la page complète
 */

/**
 * Extrait le nombre de portions depuis un texte
 * @param text - Texte à analyser (titre + snippet)
 * @returns Nombre de portions ou undefined si non trouvé
 */
export function extractServingsFromText(text: string): number | undefined {
  if (!text) return undefined;
  
  const textLower = text.toLowerCase();
  
  // Patterns pour détecter le nombre de portions (améliorés)
  // Priorité aux patterns les plus spécifiques en premier
  const patterns = [
    // "pour 4 personnes", "pour 6 personnes", "pour 4 portions", "pour 4 portion"
    /pour\s+(\d+)\s+(?:personne|personnes|portion|portions|serving|servings|convive|convives)/i,
    // "4 portions", "6 personnes", "4 servings", "4 portion" (singulier)
    /(\d+)\s+(?:portion|portions|personne|personnes|serving|servings|convive|convives)/i,
    // "4-6 personnes", "4 à 6 portions", "4 à 8 personnes", "4-6 portion"
    /(\d+)[\s-à]+(\d+)\s+(?:personne|personnes|portion|portions|serving|servings|convive|convives)/i,
    // "(4 personnes)", "(6 portions)", "(4 portion)" - entre parenthèses
    /\((\d+)\s+(?:personne|personnes|portion|portions|serving|servings|convive|convives)\)/i,
    // "4 pers.", "6 pers", "4 p." - abréviations
    /(\d+)\s*pers?\.?/i,
    // "yield: 4", "makes 4", "yields 4"
    /(?:yield|yields|makes?)\s*:?\s*(\d+)/i,
    // "pour un plat de X litres" -> estimer environ X * 4 portions (1 litre ≈ 4 portions)
    /pour\s+un\s+plat\s+de\s+(\d+)\s+litres?/i,
    // "X personnes", "X convives", "X portions", "X portion" au début ou isolé
    /(?:^|\s)(\d+)\s+(?:personnes?|convives?|portions?)(?:\s|$|,|\.)/i,
    // "recette pour X", "recette X portions", "recette X portion"
    /recette\s+(?:pour\s+)?(\d+)\s+(?:portion|portions|personne|personnes)/i,
    // "X portions par personne" -> X
    /(\d+)\s+portions?\s+par\s+personne/i,
    // "donne X portions", "donne X portion"
    /donne\s+(\d+)\s+portions?/i,
    // "environ X portions", "environ X portion"
    /environ\s+(\d+)\s+portions?/i,
    // "X portions environ", "X portion environ"
    /(\d+)\s+portions?\s+environ/i,
  ];
  
  for (const pattern of patterns) {
    const match = textLower.match(pattern);
    if (match) {
      // Si le pattern a deux groupes (ex: "4-6 personnes"), prendre la moyenne
      if (match.length === 3 && match[1] && match[2]) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
          return Math.round((min + max) / 2);
        }
      } else if (match[1]) {
        const servings = parseInt(match[1]);
        if (!isNaN(servings) && servings > 0 && servings <= 50) {
          // Cas spécial : "pour un plat de X litres" -> estimer environ X * 4 portions
          if (pattern.source.includes('litres?')) {
            // 1 litre ≈ 4 portions (estimation)
            return Math.round(servings * 4);
          }
          return servings;
        }
      }
    }
  }
  
  // Si aucun pattern ne correspond, retourner undefined
  return undefined;
}

