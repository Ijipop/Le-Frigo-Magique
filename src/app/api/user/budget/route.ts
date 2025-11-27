import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { z } from "zod";
import type { ApiResponse } from "../../../../../lib/types/api";

const budgetSchema = z.object({
  budgetHebdomadaire: z
    .number({ message: "Le budget doit être un nombre" })
    .min(0, "Le budget ne peut pas être négatif")
    .max(10000, "Le budget ne peut pas dépasser 10000$")
    .optional(),
  typeRepasBudget: z
    .enum(["dejeuner", "diner", "souper"])
    .nullable()
    .optional(),
  jourSemaineBudget: z
    .number()
    .int()
    .min(1, "Le jour doit être entre 1 et 7")
    .max(7, "Le jour doit être entre 1 et 7")
    .nullable()
    .optional(),
});

// GET - Récupérer le budget de l'utilisateur
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
        { error: "Utilisateur non trouvé ou non créé" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      data: {
        budgetHebdomadaire: utilisateur.budgetHebdomadaire || 0,
        typeRepasBudget: utilisateur.typeRepasBudget || null,
        jourSemaineBudget: utilisateur.jourSemaineBudget || null,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du budget:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le budget de l'utilisateur
export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = budgetSchema.safeParse(body);

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
        { error: "Utilisateur non trouvé ou non créé" },
        { status: 404 }
      );
    }

    const updateData: {
      budgetHebdomadaire?: number;
      typeRepasBudget?: string | null;
      jourSemaineBudget?: number | null;
    } = {};

    if (validation.data.budgetHebdomadaire !== undefined) {
      updateData.budgetHebdomadaire = validation.data.budgetHebdomadaire;
    }
    if (validation.data.typeRepasBudget !== undefined) {
      updateData.typeRepasBudget = validation.data.typeRepasBudget;
    }
    if (validation.data.jourSemaineBudget !== undefined) {
      updateData.jourSemaineBudget = validation.data.jourSemaineBudget;
    }

    const utilisateurMisAJour = await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: updateData,
    });

    return NextResponse.json<ApiResponse>({
      data: {
        budgetHebdomadaire: utilisateurMisAJour.budgetHebdomadaire,
        typeRepasBudget: utilisateurMisAJour.typeRepasBudget,
        jourSemaineBudget: utilisateurMisAJour.jourSemaineBudget,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du budget:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

