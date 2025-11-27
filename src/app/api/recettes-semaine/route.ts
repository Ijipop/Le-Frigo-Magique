import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { z } from "zod";
import type { ApiResponse } from "../../../../lib/types/api";

const createRecetteSchema = z.object({
  titre: z.string().min(1, "Le titre est requis").max(200),
  url: z.string().url("L'URL doit être valide"),
  image: z.union([
    z.string().url(),
    z.null(),
    z.literal(""),
    z.undefined()
  ]).optional().nullable(),
  snippet: z.union([
    z.string(),
    z.null(),
    z.literal(""),
    z.undefined()
  ]).optional().nullable(),
  source: z.union([
    z.string(),
    z.null(),
    z.literal(""),
    z.undefined()
  ]).optional().nullable(),
  estimatedCost: z.union([
    z.number(),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
  servings: z.union([
    z.number().int().positive().max(50),
    z.null(),
    z.undefined()
  ]).optional().nullable(),
});

// GET - Récupérer les recettes de la semaine
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    const recettes = await prisma.recetteSemaine.findMany({
      where: { utilisateurId: utilisateur.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json<ApiResponse>({
      data: recettes,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des recettes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Détails de l'erreur:", { errorMessage, errorStack });
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Ajouter une recette à la semaine
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
    console.log("📥 [API] Données reçues:", JSON.stringify(body, null, 2));
    
    const validation = createRecetteSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("❌ [API] Erreur de validation:", validation.error.flatten());
    }

    if (!validation.success) {
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si la recette existe déjà (par URL)
    const existing = await prisma.recetteSemaine.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        url: validation.data.url,
      },
    });

    if (existing) {
      return NextResponse.json<ApiResponse>(
        { error: "Cette recette est déjà dans vos recettes de la semaine" },
        { status: 409 }
      );
    }

    // Normaliser les valeurs null/undefined/vides
    const normalizeValue = (val: string | null | undefined | ""): string | null => {
      if (val === null || val === undefined || val === "") {
        return null;
      }
      return val;
    };

    const recetteData = {
      utilisateurId: utilisateur.id,
      titre: validation.data.titre,
      url: validation.data.url,
      image: normalizeValue(validation.data.image),
      snippet: normalizeValue(validation.data.snippet),
      source: normalizeValue(validation.data.source),
      estimatedCost: validation.data.estimatedCost && typeof validation.data.estimatedCost === 'number' 
        ? validation.data.estimatedCost 
        : null,
      servings: validation.data.servings && typeof validation.data.servings === 'number' && validation.data.servings > 0
        ? validation.data.servings
        : null,
    };
    
    console.log("💾 [API] Données à sauvegarder:", JSON.stringify(recetteData, null, 2));
    
    const recette = await prisma.recetteSemaine.create({
      data: recetteData,
    });
    
    console.log("✅ [API] Recette créée avec succès:", recette.id);

    return NextResponse.json<ApiResponse>(
      {
        data: recette,
        message: "Recette ajoutée à la semaine",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout de la recette:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Détails de l'erreur:", { errorMessage, errorStack });
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une recette de la semaine
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const recetteId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer toutes les recettes
    if (deleteAll) {
      const result = await prisma.recetteSemaine.deleteMany({
        where: {
          utilisateurId: utilisateur.id,
        },
      });

      return NextResponse.json<ApiResponse>({
        data: { success: true, deletedCount: result.count },
        message: `${result.count} recette${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""}`,
      });
    }

    // Supprimer une recette spécifique
    if (!recetteId) {
      return NextResponse.json<ApiResponse>(
        { error: "ID de recette requis ou paramètre 'all' manquant" },
        { status: 400 }
      );
    }

    // Vérifier que la recette appartient à l'utilisateur
    const recette = await prisma.recetteSemaine.findFirst({
      where: {
        id: recetteId,
        utilisateurId: utilisateur.id,
      },
    });

    if (!recette) {
      return NextResponse.json<ApiResponse>(
        { error: "Recette non trouvée" },
        { status: 404 }
      );
    }

    await prisma.recetteSemaine.delete({
      where: { id: recetteId },
    });

    return NextResponse.json<ApiResponse>({
      data: { success: true },
      message: "Recette supprimée",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Détails de l'erreur:", { errorMessage, errorStack });
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur", details: errorMessage },
      { status: 500 }
    );
  }
}

