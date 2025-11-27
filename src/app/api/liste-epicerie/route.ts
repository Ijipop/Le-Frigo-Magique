import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { createLigneListeSchema } from "../../../../lib/validations/liste-epicerie";
import type { ApiResponse } from "../../../../lib/types/api";

// GET - Récupérer la liste d'épicerie active de l'utilisateur
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Récupérer ou créer la liste d'épicerie active (la plus récente)
    let liste = await prisma.listeEpicerie.findFirst({
      where: { utilisateurId: utilisateur.id },
      include: {
        lignes: {
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Si aucune liste n'existe, en créer une
    if (!liste) {
      liste = await prisma.listeEpicerie.create({
        data: {
          utilisateurId: utilisateur.id,
        },
        include: {
          lignes: true,
        },
      });
    }

    return NextResponse.json<ApiResponse>({ data: liste });
  } catch (error) {
    console.error("Erreur lors de la récupération de la liste d'épicerie:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST - Ajouter un item à la liste d'épicerie
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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

    const validationResult = createLigneListeSchema.safeParse({
      nom: body.nom,
      quantite: typeof body.quantite === "string" ? parseFloat(body.quantite) : body.quantite,
      unite: body.unite || null,
      prixEstime: body.prixEstime !== undefined 
        ? (typeof body.prixEstime === "string" ? parseFloat(body.prixEstime) : body.prixEstime)
        : null,
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

    // Récupérer ou créer la liste d'épicerie active
    let liste = await prisma.listeEpicerie.findFirst({
      where: { utilisateurId: utilisateur.id },
      orderBy: { createdAt: "desc" },
    });

    if (!liste) {
      liste = await prisma.listeEpicerie.create({
        data: {
          utilisateurId: utilisateur.id,
        },
      });
    }

    // Créer la ligne de liste
    const ligne = await prisma.ligneListe.create({
      data: {
        listeId: liste.id,
        nom: validationResult.data.nom,
        quantite: validationResult.data.quantite,
        unite: validationResult.data.unite || null,
        prixEstime: validationResult.data.prixEstime || null,
      },
    });

    return NextResponse.json<ApiResponse>(
      { data: ligne, message: "Item ajouté à la liste d'épicerie" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un item:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

