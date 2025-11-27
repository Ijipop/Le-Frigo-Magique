import { NextResponse } from "next/server";
import { estimateRecipeCost } from "../../../../lib/utils/recipeCostEstimator";

/**
 * API pour estimer rapidement le coût d'une recette basé sur son titre et snippet
 * Utilise GPT pour une estimation intelligente sans avoir besoin de lire toute la recette
 * 
 * Approche MVP : Estimation rapide basée sur :
 * - Titre de la recette
 * - Snippet/résumé
 * - Mots-clés détectés (protéines, type de recette, etc.)
 * - Contexte québécois (prix moyens au Québec)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, snippet } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }

    const result = await estimateRecipeCost(title, snippet || "");
    
    return NextResponse.json({ 
      estimatedCost: result.estimatedCost,
      source: result.source,
      method: result.source === "gpt" ? "llm_estimation" : "rule_based"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur serveur", estimatedCost: null },
      { status: 500 }
    );
  }
}

