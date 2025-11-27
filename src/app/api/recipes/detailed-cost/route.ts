import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { calculateDetailedRecipeCost } from "../../../../../lib/utils/detailedRecipeCost";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/utils/logger";
import { z } from "zod";

const requestSchema = z.object({
  url: z.string().url("L'URL doit être valide"),
});

/**
 * API pour calculer le coût détaillé d'une recette
 * 
 * Cette API :
 * - Extrait uniquement les ingrédients (données factuelles, légal)
 * - Ne stocke pas le contenu complet de la recette
 * - Respecte robots.txt
 * - Calcule le coût basé sur les ingrédients réels
 * 
 * Utilisation : Appelée uniquement quand l'utilisateur sélectionne une recette
 * pour obtenir un calcul plus précis que l'estimation rapide.
 */
export async function POST(req: Request) {
  let url: string | undefined;
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "URL invalide", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    url = validation.data.url;

    // Récupérer le code postal de l'utilisateur pour les prix Flipp
    const utilisateur = await getOrCreateUser(userId);
    let postalCode: string | undefined;

    if (utilisateur) {
      try {
        const preferences = await prisma.preferences.findUnique({
          where: { utilisateurId: utilisateur.id },
        });
        postalCode = preferences?.codePostal || undefined;
      } catch (error) {
        logger.warn("Erreur lors de la récupération du code postal", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Calculer le coût détaillé
    const result = await calculateDetailedRecipeCost(url, postalCode);

    logger.info("Coût détaillé calculé avec succès", {
      url: url,
      totalCost: result.totalCost,
      ingredientsCount: result.ingredients.length,
    });

    return NextResponse.json({
      success: true,
      data: result,
      // Note légale importante
      legalNotice: {
        message: "Les ingrédients sont extraits uniquement à des fins de calcul de coût. Le contenu complet de la recette reste la propriété de la source originale.",
        source: url,
        attribution: "Veuillez consulter la source originale pour les instructions complètes.",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error("Erreur lors du calcul du coût détaillé", {
      error: errorMessage,
      stack: errorStack,
      url: validation.data.url,
    });

    // Erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes("robots.txt")) {
        return NextResponse.json(
          {
            error: "Ce site bloque l'extraction automatique. Veuillez consulter la recette directement sur le site source.",
            code: "ROBOTS_BLOCKED",
          },
          { status: 403 }
        );
      }

      if (error.message.includes("HTTP 4") || error.message.includes("HTTP 5")) {
        return NextResponse.json(
          {
            error: "Impossible d'accéder à cette recette. Veuillez vérifier l'URL.",
            code: "ACCESS_DENIED",
          },
          { status: 404 }
        );
      }

      if (error.message.includes("timeout") || error.message.includes("trop de temps")) {
        return NextResponse.json(
          {
            error: "Le site a pris trop de temps à répondre. Veuillez réessayer plus tard.",
            code: "TIMEOUT",
          },
          { status: 408 }
        );
      }
    }

    // En cas d'erreur inconnue, retourner une estimation par défaut plutôt qu'une erreur
    logger.warn("Erreur inconnue, retour d'une estimation par défaut", {
      error: errorMessage,
      url: url || "unknown",
    });

    return NextResponse.json({
      success: true,
      data: {
        totalCost: 10.00,
        ingredients: [],
        servings: undefined,
        costPerServing: undefined,
        source: url || "",
        method: "detailed_parsing",
        fallback: true,
        error: errorMessage,
      },
      legalNotice: {
        message: "Les ingrédients sont extraits uniquement à des fins de calcul de coût. Le contenu complet de la recette reste la propriété de la source originale.",
        source: url || "",
        attribution: "Veuillez consulter la source originale pour les instructions complètes.",
      },
    });
  }
}

