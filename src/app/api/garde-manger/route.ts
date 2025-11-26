import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Récupérer tous les articles du garde-manger de l'utilisateur connecté
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Trouver l'utilisateur Prisma à partir de l'ID Clerk
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { authUserId: userId },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Récupérer les articles du garde-manger
    const articles = await prisma.articleGardeManger.findMany({
      where: { utilisateurId: utilisateur.id },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Erreur lors de la récupération du garde-manger:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Ajouter un nouvel article au garde-manger
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { nom, quantite, unite } = body;

    if (!nom || quantite === undefined) {
      return NextResponse.json(
        { error: "Le nom et la quantité sont requis" },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur Prisma
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { authUserId: userId },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Créer l'article
    const article = await prisma.articleGardeManger.create({
      data: {
        utilisateurId: utilisateur.id,
        nom,
        quantite: parseFloat(quantite),
        unite: unite || null,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un article:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

