import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const body = await req.json();
    const { nom, quantite, unite } = body;

    // Trouver l'utilisateur Prisma
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { authUserId: userId },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier que l'article appartient à l'utilisateur
    const article = await prisma.articleGardeManger.findFirst({
      where: {
        id,
        utilisateurId: utilisateur.id,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    // Mettre à jour l'article
    const articleMisAJour = await prisma.articleGardeManger.update({
      where: { id },
      data: {
        nom: nom || article.nom,
        quantite: quantite !== undefined ? parseFloat(quantite) : article.quantite,
        unite: unite !== undefined ? unite : article.unite,
      },
    });

    return NextResponse.json(articleMisAJour);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'article:", error);
    return NextResponse.json(
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

    // Trouver l'utilisateur Prisma
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { authUserId: userId },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Vérifier que l'article appartient à l'utilisateur
    const article = await prisma.articleGardeManger.findFirst({
      where: {
        id,
        utilisateurId: utilisateur.id,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article non trouvé" }, { status: 404 });
    }

    // Supprimer l'article
    await prisma.articleGardeManger.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Article supprimé" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'article:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

