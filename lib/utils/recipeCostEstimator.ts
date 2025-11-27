import { logger } from "./logger";

/**
 * Estime rapidement le coût d'une recette basé sur son titre et snippet
 * Utilise GPT si disponible, sinon des règles simples
 * 
 * Approche MVP : Estimation rapide sans avoir besoin de lire toute la recette
 */
export async function estimateRecipeCost(
  title: string,
  snippet: string = ""
): Promise<{ estimatedCost: number; source: string }> {
  if (!title) {
    return { estimatedCost: 10.00, source: "fallback" };
  }

  // Si on a OpenAI configuré, utiliser GPT pour une estimation intelligente
  if (process.env.OPENAI_API_KEY) {
    try {
      const estimatedCost = await estimateWithGPT(title, snippet);
      return { estimatedCost, source: "gpt" };
    } catch (error) {
      logger.warn("Erreur lors de l'estimation GPT, fallback sur logique maison", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback sur logique maison si GPT échoue
    }
  }

  // Fallback : Estimation basée sur des règles simples (logique maison)
  const estimatedCost = estimateWithRules(title, snippet);
  return { estimatedCost, source: "rules" };
}

/**
 * Estimation avec GPT (OpenAI)
 */
async function estimateWithGPT(title: string, snippet: string): Promise<number> {
  const prompt = `Tu es un expert en estimation de coûts de recettes au Québec. 

Estime le coût approximatif total (en dollars CAD) pour préparer cette recette au Québec, en te basant uniquement sur le titre et la description.

Titre: ${title}
Description: ${snippet || "Aucune description"}

Considérations:
- Prix moyens au Québec (épiceries comme IGA, Metro, Provigo, Maxi)
- Pour 4 personnes (portion standard)
- Inclus tous les ingrédients nécessaires
- Sois réaliste : une recette simple avec pâtes et légumes = 5-8$, un steak = 12-18$, du saumon = 15-25$

Réponds UNIQUEMENT avec un nombre décimal (ex: 12.50), sans texte, sans explication, juste le prix.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // Modèle économique et rapide
      messages: [
        {
          role: "system",
          content: "Tu es un assistant qui estime le coût de recettes au Québec. Tu réponds uniquement avec un nombre décimal.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Plus déterministe pour des estimations
      max_tokens: 10, // Juste le nombre
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Réponse GPT vide");
  }

  // Extraire le nombre de la réponse
  const match = content.match(/[\d.]+/);
  if (match) {
    const cost = parseFloat(match[0]);
    if (isNaN(cost) || cost <= 0) {
      throw new Error(`Coût invalide: ${cost}`);
    }
    // Limiter à un maximum raisonnable (200$ pour une recette)
    return Math.min(cost, 200);
  }

  throw new Error(`Impossible d'extraire un nombre de: ${content}`);
}

/**
 * Estimation basée sur des règles (fallback sans GPT)
 * Détecte les mots-clés et estime selon des catégories
 */
function estimateWithRules(title: string, snippet: string): number {
  const text = `${title} ${snippet}`.toLowerCase();
  
  // Catégories de prix par ingrédient/protéine principale
  const priceCategories: { keywords: string[]; basePrice: number }[] = [
    // Très économique (légumes, pâtes simples, riz)
    { keywords: ["pâtes", "pates", "spaghetti", "riz", "lentilles", "haricots", "tofu", "légumes", "salade"], basePrice: 5 },
    // Économique (poulet, porc, œufs)
    { keywords: ["poulet", "porc", "jambon", "saucisse", "œuf", "oeuf", "omelette"], basePrice: 8 },
    // Moyen (bœuf, fromage, poisson simple)
    { keywords: ["bœuf", "boeuf", "steak", "hamburger", "fromage", "thon", "poisson"], basePrice: 12 },
    // Cher (saumon, crevettes, viande premium)
    { keywords: ["saumon", "crevette", "homard", "filet", "agneau", "veau"], basePrice: 18 },
    // Très cher (fruits de mer, spécialités)
    { keywords: ["homard", "crabe", "coquilles", "foie gras"], basePrice: 25 },
  ];

  // Détecter la catégorie de prix
  let basePrice = 10; // Prix par défaut
  for (const category of priceCategories) {
    if (category.keywords.some(keyword => text.includes(keyword))) {
      basePrice = category.basePrice;
      break; // Prendre la première correspondance (priorité aux plus chers)
    }
  }

  // Ajustements selon le contexte
  let multiplier = 1.0;

  // Recettes "économiques" ou "pas cher"
  if (text.includes("économique") || text.includes("pas cher") || text.includes("budget")) {
    multiplier = 0.7;
  }

  // Recettes "gourmet" ou "raffiné"
  if (text.includes("gourmet") || text.includes("raffiné") || text.includes("premium")) {
    multiplier = 1.5;
  }

  // Recettes simples/rapides (moins d'ingrédients)
  if (text.includes("rapide") || text.includes("simple") || text.includes("facile") || text.includes("15 minutes") || text.includes("30 minutes")) {
    multiplier *= 0.9;
  }

  // Recettes avec plusieurs protéines ou ingrédients coûteux
  const expensiveCount = ["saumon", "crevette", "bœuf", "boeuf", "fromage", "champignon"].filter(
    keyword => text.includes(keyword)
  ).length;
  if (expensiveCount > 2) {
    multiplier *= 1.2;
  }

  const finalPrice = basePrice * multiplier;
  
  // Arrondir à 2 décimales et s'assurer d'un minimum de 3$ et maximum de 50$
  return Math.max(3, Math.min(50, Math.round(finalPrice * 100) / 100));
}

