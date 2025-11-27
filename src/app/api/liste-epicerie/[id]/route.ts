import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { updateLigneListeSchema } from "../../../../../lib/validations/liste-epicerie";
import type { ApiResponse } from "../../../../../lib/types/api";

// PUT - Mettre à jour une ligne de liste
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

    if (!id || typeof id !== "string") {
      return NextResponse.json<ApiResponse>(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json<ApiResponse>(
        { error: "Format JSON invalide" },
        { status: 400 }
      );
    }

    const validationResult = updateLigneListeSchema.safeParse({
      nom: body.nom,
      quantite: body.quantite !== undefined
        ? (typeof body.quantite === "string" ? parseFloat(body.quantite) : body.quantite)
        : undefined,
      unite: body.unite !== undefined ? (body.unite || null) : undefined,
      prixEstime: body.prixEstime !== undefined
        ? (typeof body.prixEstime === "string" ? parseFloat(body.prixEstime) : body.prixEstime)
        : undefined,
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

    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Vérifier que la ligne appartient à une liste de l'utilisateur
    const ligne = await prisma.ligneListe.findFirst({
      where: { id },
      include: {
        liste: true,
      },
    });

    if (!ligne || ligne.liste.utilisateurId !== utilisateur.id) {
      return NextResponse.json<ApiResponse>(
        { error: "Ligne non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    // Mettre à jour la ligne
    const updateData: {
      nom?: string;
      quantite?: number;
      unite?: string | null;
      prixEstime?: number | null;
    } = {};

    if (validationResult.data.nom !== undefined) {
      updateData.nom = validationResult.data.nom;
    }
    if (validationResult.data.quantite !== undefined) {
      updateData.quantite = validationResult.data.quantite;
    }
    if (validationResult.data.unite !== undefined) {
      updateData.unite = validationResult.data.unite;
    }
    if (validationResult.data.prixEstime !== undefined) {
      updateData.prixEstime = validationResult.data.prixEstime;
    }

    const ligneMiseAJour = await prisma.ligneListe.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json<ApiResponse>({
      data: ligneMiseAJour,
      message: "Ligne mise à jour avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une ligne de liste
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

    if (!id || typeof id !== "string") {
      return NextResponse.json<ApiResponse>(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Vérifier que la ligne appartient à une liste de l'utilisateur
    const ligne = await prisma.ligneListe.findFirst({
      where: { id },
      include: {
        liste: true,
      },
    });

    if (!ligne || ligne.liste.utilisateurId !== utilisateur.id) {
      return NextResponse.json<ApiResponse>(
        { error: "Ligne non trouvée ou accès non autorisé" },
        { status: 404 }
      );
    }

    await prisma.ligneListe.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse>({
      data: null,
      message: "Ligne supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

