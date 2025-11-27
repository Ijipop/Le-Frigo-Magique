import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { z } from "zod";
import type { ApiResponse } from "../../../../lib/types/api";

// Schéma simplifié pour éviter les problèmes de validation
const createRecetteSchema = z.object({
  titre: z.string().min(1, "Le titre est requis").max(200),
  url: z.string().url("L'URL doit être valide"),
  image: z.any().optional().nullable(),
  snippet: z.any().optional().nullable(),
  source: z.any().optional().nullable(),
  estimatedCost: z.any().optional().nullable(),
  servings: z.any().optional().nullable(),
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
    console.log("🚀 [API] POST /api/recettes-semaine - Début");
    
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ [API] Pas d'userId");
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    console.log("✅ [API] userId:", userId);

    let body: any;
    try {
      body = await req.json();
      console.log("📥 [API] Données reçues:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("❌ [API] Erreur lors du parsing JSON:", parseError);
      return NextResponse.json<ApiResponse>(
        { error: "Données JSON invalides" },
        { status: 400 }
      );
    }
    
    // Validation basique des champs requis
    if (!body.titre || typeof body.titre !== 'string' || body.titre.trim().length === 0) {
      console.error("❌ [API] Titre invalide:", body.titre);
      return NextResponse.json<ApiResponse>(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }

    if (!body.url || typeof body.url !== 'string' || !body.url.startsWith('http')) {
      console.error("❌ [API] URL invalide:", body.url);
      return NextResponse.json<ApiResponse>(
        { error: "L'URL est requise et doit être valide" },
        { status: 400 }
      );
    }

    // Normaliser les valeurs avant validation
    const normalizedBody: any = {
      titre: body.titre.trim(),
      url: body.url.trim(),
    };
    
    // Gérer les champs optionnels - toujours les inclure pour que Zod puisse les valider
    normalizedBody.image = (body.image === "" || body.image === null || body.image === undefined) ? null : (typeof body.image === 'string' ? body.image : null);
    normalizedBody.snippet = (body.snippet === "" || body.snippet === null || body.snippet === undefined) ? null : (typeof body.snippet === 'string' ? body.snippet : null);
    normalizedBody.source = (body.source === "" || body.source === null || body.source === undefined) ? null : (typeof body.source === 'string' ? body.source : null);
    normalizedBody.estimatedCost = (body.estimatedCost === null || body.estimatedCost === undefined || (typeof body.estimatedCost === 'number' && body.estimatedCost <= 0)) ? null : (typeof body.estimatedCost === 'number' ? body.estimatedCost : null);
    normalizedBody.servings = (body.servings === null || body.servings === undefined || (typeof body.servings === 'number' && (body.servings <= 0 || body.servings > 50))) ? null : (typeof body.servings === 'number' ? body.servings : null);
    
    console.log("📥 [API] Données normalisées:", JSON.stringify(normalizedBody, null, 2));
    
    const validation = createRecetteSchema.safeParse(normalizedBody);
    
    if (!validation.success) {
      console.error("❌ [API] Erreur de validation:", JSON.stringify(validation.error.errors, null, 2));
      console.error("❌ [API] Données qui ont échoué:", JSON.stringify(normalizedBody, null, 2));
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    console.log("✅ [API] Validation réussie");

    console.log("👤 [API] Récupération de l'utilisateur...");
    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      console.error("❌ [API] Utilisateur non trouvé");
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    console.log("✅ [API] Utilisateur trouvé:", utilisateur.id);

    // Vérifier si la recette existe déjà (par URL)
    console.log("🔍 [API] Vérification si la recette existe déjà...");
    const existing = await prisma.recetteSemaine.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        url: validation.data.url,
      },
    });

    if (existing) {
      console.log("⚠️ [API] Recette déjà existante");
      return NextResponse.json<ApiResponse>(
        { error: "Cette recette est déjà dans vos recettes de la semaine" },
        { status: 409 }
      );
    }
    console.log("✅ [API] Recette n'existe pas encore");

    // Normaliser les valeurs null/undefined/vides
    const normalizeValue = (val: string | null | undefined | ""): string | null => {
      if (val === null || val === undefined || val === "") {
        return null;
      }
      return val;
    };

    // Normaliser estimatedCost et servings - gérer les cas où ils sont des chaînes
    let estimatedCost: number | null = null;
    if (validation.data.estimatedCost !== null && validation.data.estimatedCost !== undefined) {
      if (typeof validation.data.estimatedCost === 'number') {
        estimatedCost = validation.data.estimatedCost > 0 ? validation.data.estimatedCost : null;
      } else if (typeof validation.data.estimatedCost === 'string') {
        const parsed = parseFloat(validation.data.estimatedCost);
        estimatedCost = !isNaN(parsed) && parsed > 0 ? parsed : null;
      }
    }

    let servings: number | null = null;
    if (validation.data.servings !== null && validation.data.servings !== undefined) {
      if (typeof validation.data.servings === 'number') {
        servings = validation.data.servings > 0 && validation.data.servings <= 50 ? validation.data.servings : null;
      } else if (typeof validation.data.servings === 'string') {
        const parsed = parseInt(validation.data.servings, 10);
        servings = !isNaN(parsed) && parsed > 0 && parsed <= 50 ? parsed : null;
      }
    }

    const recetteData = {
      utilisateurId: utilisateur.id,
      titre: validation.data.titre,
      url: validation.data.url,
      image: normalizeValue(validation.data.image),
      snippet: normalizeValue(validation.data.snippet),
      source: normalizeValue(validation.data.source),
      estimatedCost,
      servings,
    };
    
    console.log("💾 [API] Données à sauvegarder:", JSON.stringify(recetteData, null, 2));
    console.log("💾 [API] Types des données:", {
      utilisateurId: typeof recetteData.utilisateurId,
      titre: typeof recetteData.titre,
      url: typeof recetteData.url,
      image: typeof recetteData.image,
      snippet: typeof recetteData.snippet,
      source: typeof recetteData.source,
      estimatedCost: typeof recetteData.estimatedCost,
      servings: typeof recetteData.servings,
    });
    
    try {
      console.log("💾 [API] Tentative de création en base de données...");
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
    } catch (dbError) {
      console.error("❌ [API] Erreur lors de la création en base de données:", dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      const dbErrorStack = dbError instanceof Error ? dbError.stack : undefined;
      console.error("Détails de l'erreur DB:", { dbErrorMessage, dbErrorStack });
      
      // Si c'est une erreur de contrainte unique (recette déjà existante)
      if (dbErrorMessage.includes("Unique constraint") || dbErrorMessage.includes("duplicate key")) {
        return NextResponse.json<ApiResponse>(
          { error: "Cette recette est déjà dans vos recettes de la semaine" },
          { status: 409 }
        );
      }
      
      throw dbError; // Relancer pour être capturé par le catch externe
    }
  } catch (error) {
    console.error("❌ [API] ERREUR GLOBALE lors de l'ajout de la recette:");
    console.error("❌ [API] Type d'erreur:", error?.constructor?.name);
    console.error("❌ [API] Erreur complète:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : "Unknown";
    
    console.error("❌ [API] Détails de l'erreur:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
    });
    
    // Si c'est une erreur Prisma, donner plus de détails
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("❌ [API] Code d'erreur Prisma:", (error as any).code);
      console.error("❌ [API] Meta Prisma:", (error as any).meta);
    }
    
    return NextResponse.json<ApiResponse>(
      { 
        error: "Erreur serveur", 
        details: errorMessage,
        // En développement, inclure plus de détails
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
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

