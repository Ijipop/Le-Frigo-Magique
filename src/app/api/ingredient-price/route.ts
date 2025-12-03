import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { normalizeIngredientName } from "../../../../lib/utils/ingredientMatcher";
import { getFallbackPrice } from "../../../../lib/utils/priceFallback";
import { getGovPrice } from "../../../../lib/utils/govPriceLoader.server";

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

    // 1. Chercher dans la BD PrixIngredient (priorité aux prix gouvernementaux)
    try {
      // Chercher d'abord les prix gouvernementaux (source="government")
      let prixIngredient = await prisma.prixIngredient.findFirst({
        where: { 
          nom: normalized,
          source: "government",
        },
      });

      // Si pas trouvé, chercher n'importe quel prix (Flipp, etc.)
      if (!prixIngredient) {
        prixIngredient = await prisma.prixIngredient.findUnique({
          where: { nom: normalized },
        });
      }

      if (prixIngredient) {
        return NextResponse.json({
          success: true,
          data: {
            prix: prixIngredient.prixMoyen,
            source: prixIngredient.source === "government" ? "government" : "database",
            categorie: prixIngredient.categorie || null,
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de la recherche dans PrixIngredient:", error);
    }

    // 2. Fallback: Chercher dans les prix gouvernementaux (CSV) si pas encore importé dans la BD
    // Cette étape sera de moins en moins utilisée une fois l'import fait
    try {
      const govPrice = getGovPrice(ingredient);
      if (govPrice !== null && govPrice > 0) {
        const fallback = getFallbackPrice(ingredient); // Pour obtenir la catégorie
        return NextResponse.json({
          success: true,
          data: {
            prix: govPrice,
            source: "government",
            categorie: fallback?.categorie || null,
          },
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du prix gouvernemental:", error);
    }

    // 3. Si pas trouvé, utiliser le fallback manuel
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

