import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { createArticleSchema } from "../../../../lib/validations/garde-manger";
import type { ApiResponse } from "../../../../lib/types/api";

// GET - Récupérer tous les articles du garde-manger de l'utilisateur connecté
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupérer ou créer l'utilisateur Prisma
    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>({ error: "Impossible de récupérer l'utilisateur" }, { status: 500 });
    }

    // Récupérer les articles du garde-manger
    const articles = await prisma.articleGardeManger.findMany({
      where: { utilisateurId: utilisateur.id },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json<ApiResponse>({ data: articles });
  } catch (error) {
    console.error("Erreur lors de la récupération du garde-manger:", error);
    return NextResponse.json<ApiResponse>(
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
    const validationResult = createArticleSchema.safeParse({
      nom: body.nom,
      quantite: typeof body.quantite === "string" ? parseFloat(body.quantite) : body.quantite,
      unite: body.unite || null,
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

    const { nom, quantite, unite } = validationResult.data;

    // Récupérer ou créer l'utilisateur Prisma
    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Créer l'article
    const article = await prisma.articleGardeManger.create({
      data: {
        utilisateurId: utilisateur.id,
        nom,
        quantite,
        unite,
      },
    });

    return NextResponse.json<ApiResponse>(
      { data: article, message: "Article créé avec succès" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un article:", error);
    
    // Gérer les erreurs Prisma spécifiques
    if (error instanceof Error && "code" in error) {
      if (error.code === "P2002") {
        return NextResponse.json<ApiResponse>(
          { error: "Un article avec ce nom existe déjà" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

