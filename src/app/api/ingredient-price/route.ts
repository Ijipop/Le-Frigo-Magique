import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { normalizeIngredientName } from "../../../../lib/utils/ingredientMatcher";
import { getFallbackPrice } from "../../../../lib/utils/priceFallback";

export const runtime = "nodejs";

/**
 * GET - Récupère le prix d'un ingrédient depuis la BD PrixIngredient
 * ou utilise le fallback si pas trouvé
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ingredient = searchParams.get("ingredient");

    if (!ingredient || !ingredient.trim()) {
      return NextResponse.json(
        { error: "Le nom de l'ingrédient est requis" },
        { status: 400 }
      );
    }

    // Normaliser le nom de l'ingrédient
    const normalized = normalizeIngredientName(ingredient);

    // Chercher dans la BD PrixIngredient
    try {
      const prixIngredient = await prisma.prixIngredient.findUnique({
        where: { nom: normalized },
      });

      if (prixIngredient) {
        return NextResponse.json({
          success: true,
          data: {
            prix: prixIngredient.prixMoyen,
            source: "database",
            categorie: prixIngredient.categorie || null,
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de la recherche dans PrixIngredient:", error);
    }

    // Si pas trouvé dans la BD, utiliser le fallback
    const fallback = getFallbackPrice(ingredient);
    if (fallback) {
      return NextResponse.json({
        success: true,
        data: {
          prix: fallback.prix,
          source: "fallback",
          categorie: fallback.categorie,
        },
      });
    }

    // Dernier recours : prix par défaut
    return NextResponse.json({
      success: true,
      data: {
        prix: 4.50, // Prix par défaut
        source: "default",
        categorie: "autres",
      },
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du prix:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

