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
  
  // Patterns pour détecter le nombre de portions
  const patterns = [
    // "pour 4 personnes", "pour 6 personnes"
    /pour\s+(\d+)\s+(?:personne|personnes|portion|portions|serving|servings)/i,
    // "4 portions", "6 personnes"
    /(\d+)\s+(?:portion|portions|personne|personnes|serving|servings)/i,
    // "serves 4", "serve 6"
    /serves?\s+(\d+)/i,
    // "4-6 personnes", "4 à 6 portions"
    /(\d+)[\s-à]+(\d+)\s+(?:personne|personnes|portion|portions)/i,
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
          return servings;
        }
      }
    }
  }
  
  return undefined;
}

