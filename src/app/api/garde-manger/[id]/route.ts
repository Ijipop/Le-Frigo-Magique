import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { updateArticleSchema } from "../../../../../lib/validations/garde-manger";
import type { ApiResponse } from "../../../../../lib/types/api";

// PUT - Mettre à jour un article
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Valider l'ID
    if (!id || typeof id !== "string") {
      return NextResponse.json<ApiResponse>(
        { error: "ID d'article invalide" },
        { status: 400 }
      );
    }

    // Parser et valider le body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        { error: "Format JSON invalide" },
        { status: 400 }
      );
    }

    // Valider les données avec Zod
    const validationResult = updateArticleSchema.safeParse({
      nom: body.nom,
      quantite: body.quantite !== undefined 
        ? (typeof body.quantite === "string" ? parseFloat(body.quantite) : body.quantite)
        : undefined,
      unite: body.unite !== undefined ? (body.unite || null) : undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Récupérer ou créer l'utilisateur Prisma
    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Vérifier que l'article appartient à l'utilisateur
    const article = await prisma.articleGardeManger.findFirst({
      where: {
        id,
        utilisateurId: utilisateur.id,
      },
    });

    if (!article) {
      return NextResponse.json<ApiResponse>(
        { error: "Article non trouvé ou vous n'avez pas l'autorisation" },
        { status: 404 }
      );
    }

    // Mettre à jour l'article avec les données validées
    const { nom, quantite, unite } = validationResult.data;
    const articleMisAJour = await prisma.articleGardeManger.update({
      where: { id },
      data: {
        nom: nom ?? article.nom,
        quantite: quantite ?? article.quantite,
        unite: unite !== undefined ? unite : article.unite,
      },
    });

    return NextResponse.json<ApiResponse>(
      { data: articleMisAJour, message: "Article mis à jour avec succès" }
    );
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un article
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    // Valider l'ID
    if (!id || typeof id !== "string") {
      return NextResponse.json<ApiResponse>(
        { error: "ID d'article invalide" },
        { status: 400 }
      );
    }

    // Récupérer ou créer l'utilisateur Prisma
    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Vérifier que l'article appartient à l'utilisateur
    const article = await prisma.articleGardeManger.findFirst({
      where: {
        id,
        utilisateurId: utilisateur.id,
      },
    });

    if (!article) {
      return NextResponse.json<ApiResponse>(
        { error: "Article non trouvé ou vous n'avez pas l'autorisation" },
        { status: 404 }
      );
    }

    // Supprimer l'article
    await prisma.articleGardeManger.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>(
      { data: null, message: "Article supprimé avec succès" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la suppression de l'article:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

