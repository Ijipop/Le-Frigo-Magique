import { NextResponse } from "next/server";
import { getGovPrice } from "../../../../lib/utils/govPriceLoader.server";

export const runtime = "nodejs";

/**
 * GET - Recherche un prix gouvernemental pour un ingrédient
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ingredient = searchParams.get("ingredient");

    if (!ingredient || !ingredient.trim()) {
      return NextResponse.json(
        { error: "Le nom de l'ingrédient est requis" },
        { status: 400 }
      );
    }

    // Utiliser la fonction de chargement côté serveur
    const prix = getGovPrice(ingredient);
    
    return NextResponse.json({
      success: true,
      data: { prix: prix !== null ? prix : null },
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du prix gouvernemental:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

