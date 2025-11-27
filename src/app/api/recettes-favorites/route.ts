import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { logger } from "../../../../lib/utils/logger";
import { withRateLimit, RateLimitConfigs } from "../../../../lib/utils/rateLimit";

// GET - Récupérer toutes les recettes favorites de l'utilisateur
export const GET = withRateLimit(
  RateLimitConfigs.SEARCH,
  async () => {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    try {
      const utilisateur = await getOrCreateUser(userId);
      if (!utilisateur) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      const favorites = await prisma.recetteFavoriteSearch.findMany({
        where: {
          utilisateurId: utilisateur.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        data: favorites,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        "Erreur lors de la récupération des favoris",
        error instanceof Error ? error : new Error(errorMessage),
        { message: errorMessage }
      );
      return NextResponse.json(
        { error: "Erreur lors de la récupération des favoris" },
        { status: 500 }
      );
    }
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);

// POST - Ajouter une recette aux favoris
export const POST = withRateLimit(
  RateLimitConfigs.SEARCH,
  async (req: Request) => {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    try {
      const body = await req.json();
      const { titre, url, image, snippet, source, estimatedCost, servings } = body;

      if (!titre || !url) {
        return NextResponse.json(
          { error: "Titre et URL sont requis" },
          { status: 400 }
        );
      }

      const utilisateur = await getOrCreateUser(userId);
      if (!utilisateur) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      // Vérifier si la recette est déjà en favoris
      const existing = await prisma.recetteFavoriteSearch.findUnique({
        where: {
          utilisateurId_url: {
            utilisateurId: utilisateur.id,
            url: url,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Cette recette est déjà dans vos favoris" },
          { status: 409 }
        );
      }

      // Ajouter aux favoris
      const favorite = await prisma.recetteFavoriteSearch.create({
        data: {
          utilisateurId: utilisateur.id,
          titre,
          url,
          image: image || null,
          snippet: snippet || null,
          source: source || null,
          estimatedCost: estimatedCost || null,
          servings: servings || null,
        },
      });

      return NextResponse.json({
        data: favorite,
        message: "Recette ajoutée aux favoris",
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        "Erreur lors de l'ajout aux favoris",
        error instanceof Error ? error : new Error(errorMessage),
        { message: errorMessage, code: error.code }
      );

      if (error.code === "P2002") {
        // Violation de contrainte unique
        return NextResponse.json(
          { error: "Cette recette est déjà dans vos favoris" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Erreur lors de l'ajout aux favoris" },
        { status: 500 }
      );
    }
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);

// DELETE - Retirer une recette des favoris
export const DELETE = withRateLimit(
  RateLimitConfigs.SEARCH,
  async (req: Request) => {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    try {
      const { searchParams } = new URL(req.url);
      const url = searchParams.get("url");

      if (!url) {
        return NextResponse.json(
          { error: "URL est requis" },
          { status: 400 }
        );
      }

      const utilisateur = await getOrCreateUser(userId);
      if (!utilisateur) {
        return NextResponse.json(
          { error: "Utilisateur non trouvé" },
          { status: 404 }
        );
      }

      // Supprimer des favoris
      await prisma.recetteFavoriteSearch.deleteMany({
        where: {
          utilisateurId: utilisateur.id,
          url: url,
        },
      });

      return NextResponse.json({
        message: "Recette retirée des favoris",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        "Erreur lors de la suppression des favoris",
        error instanceof Error ? error : new Error(errorMessage),
        { message: errorMessage }
      );
      return NextResponse.json(
        { error: "Erreur lors de la suppression des favoris" },
        { status: 500 }
      );
    }
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);

