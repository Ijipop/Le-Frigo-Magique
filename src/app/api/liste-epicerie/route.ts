import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { createLigneListeSchema } from "../../../../lib/validations/liste-epicerie";
import type { ApiResponse } from "../../../../lib/types/api";
import { normalizeIngredientName, matchIngredients } from "../../../../lib/utils/ingredientMatcher";

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

    // Valider et parser les données
    let quantite: number;
    if (typeof body.quantite === "string") {
      const parsed = parseFloat(body.quantite.trim());
      if (isNaN(parsed)) {
        return NextResponse.json<ApiResponse>(
          {
            error: "Données invalides",
            details: [{ path: ["quantite"], message: "La quantité doit être un nombre valide" }],
          },
          { status: 400 }
        );
      }
      quantite = parsed;
    } else if (typeof body.quantite === "number") {
      quantite = body.quantite;
    } else {
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: [{ path: ["quantite"], message: "La quantité est requise" }],
        },
        { status: 400 }
      );
    }

    // Vérifier que la quantité est positive
    if (quantite <= 0) {
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: [{ path: ["quantite"], message: "La quantité doit être supérieure à 0" }],
        },
        { status: 400 }
      );
    }

    let prixEstime: number | null = null;
    if (body.prixEstime !== undefined && body.prixEstime !== null && body.prixEstime !== "") {
      if (typeof body.prixEstime === "string") {
        const parsed = parseFloat(body.prixEstime);
        prixEstime = isNaN(parsed) ? null : parsed;
      } else if (typeof body.prixEstime === "number") {
        prixEstime = body.prixEstime;
      }
    }

    const validationResult = createLigneListeSchema.safeParse({
      nom: body.nom?.trim() || "",
      quantite,
      unite: body.unite || null,
      prixEstime,
    });

    if (!validationResult.success) {
      console.error("❌ [API] Erreur de validation:", validationResult.error.issues);
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

    // Récupérer les lignes existantes pour éviter les doublons
    const existingLines = await prisma.ligneListe.findMany({
      where: { listeId: liste.id },
    });

    // Normaliser les lignes existantes pour la comparaison
    const normalizedExistingLines = existingLines.map(line => ({
      ...line,
      normalizedName: normalizeIngredientName(line.nom),
    }));

    const normalizedNewName = normalizeIngredientName(validationResult.data.nom);
    
    // Chercher si l'ingrédient existe déjà (même nom normalisé)
    const existingLine = normalizedExistingLines.find(line => 
      matchIngredients(normalizedNewName, line.normalizedName)
    );

    let ligne;
    let message: string;

    if (existingLine) {
      // L'ingrédient existe déjà : mettre à jour la quantité
      // Si les unités sont compatibles, additionner les quantités
      const canMerge = !existingLine.unite || !validationResult.data.unite || 
                      existingLine.unite === validationResult.data.unite ||
                      (existingLine.unite.toLowerCase() === validationResult.data.unite?.toLowerCase());
      
      if (canMerge) {
        const newQuantity = existingLine.quantite + validationResult.data.quantite;
        ligne = await prisma.ligneListe.update({
          where: { id: existingLine.id },
          data: {
            quantite: newQuantity,
            // Si l'unité était vide, la remplir
            unite: existingLine.unite || validationResult.data.unite || null,
            // Mettre à jour le prix estimé si fourni
            prixEstime: validationResult.data.prixEstime || existingLine.prixEstime || null,
          },
        });
        message = `Quantité mise à jour : ${existingLine.quantite} + ${validationResult.data.quantite} = ${newQuantity} ${existingLine.unite || validationResult.data.unite || ''}`;
      } else {
        // Unités incompatibles : créer une nouvelle ligne
        ligne = await prisma.ligneListe.create({
          data: {
            listeId: liste.id,
            nom: validationResult.data.nom,
            quantite: validationResult.data.quantite,
            unite: validationResult.data.unite || null,
            prixEstime: validationResult.data.prixEstime || null,
          },
        });
        message = `Item ajouté (unité différente: ${validationResult.data.unite} vs ${existingLine.unite})`;
      }
    } else {
      // L'ingrédient n'existe pas : créer une nouvelle ligne
      ligne = await prisma.ligneListe.create({
        data: {
          listeId: liste.id,
          nom: validationResult.data.nom,
          quantite: validationResult.data.quantite,
          unite: validationResult.data.unite || null,
          prixEstime: validationResult.data.prixEstime || null,
        },
      });
      message = "Item ajouté à la liste d'épicerie";
    }

    return NextResponse.json<ApiResponse>(
      { data: ligne, message },
      { status: existingLine ? 200 : 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un item:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer toutes les lignes de la liste d'épicerie
export async function DELETE() {
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

    // Récupérer la liste d'épicerie active
    const liste = await prisma.listeEpicerie.findFirst({
      where: { utilisateurId: utilisateur.id },
      orderBy: { createdAt: "desc" },
    });

    if (!liste) {
      return NextResponse.json<ApiResponse>(
        { error: "Aucune liste d'épicerie trouvée" },
        { status: 404 }
      );
    }

    // Supprimer toutes les lignes de la liste
    const result = await prisma.ligneListe.deleteMany({
      where: { listeId: liste.id },
    });

    return NextResponse.json<ApiResponse>({
      data: { success: true, deletedCount: result.count },
      message: `${result.count} item${result.count > 1 ? "s" : ""} supprimé${result.count > 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la liste:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

