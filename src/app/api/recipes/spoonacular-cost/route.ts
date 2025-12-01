import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { calculateSpoonacularRecipeCost } from "../../../../lib/utils/spoonacularRecipeCost";
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/utils/logger";
import type { ApiResponse } from "../../../../lib/types/api";

/**
 * POST - Calcule le coût détaillé d'une recette Spoonacular
 * en tenant compte du garde-manger, des rabais Flipp et des coûts backup
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { recipeId } = body;

    if (!recipeId || typeof recipeId !== "number") {
      return NextResponse.json<ApiResponse>(
        { error: "recipeId est requis et doit être un nombre" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Récupérer le code postal pour Flipp
    const preferences = await prisma.preferences.findUnique({
      where: { utilisateurId: utilisateur.id },
    });
    const postalCode = preferences?.codePostal || undefined;

    // Calculer le coût détaillé
    const costResult = await calculateSpoonacularRecipeCost(
      recipeId,
      utilisateur.id,
      postalCode
    );

    return NextResponse.json<ApiResponse>({
      data: costResult,
    });

  } catch (error) {
    logger.error("Erreur lors du calcul du coût Spoonacular", error instanceof Error ? error : new Error(String(error)), {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json<ApiResponse>(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

