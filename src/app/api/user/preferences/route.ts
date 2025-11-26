import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { z } from "zod";
import type { ApiResponse } from "../../../../../lib/types/api";

const preferencesSchema = z.object({
  alimentsPreferes: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

// GET - Récupérer les préférences de l'utilisateur
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

    // Récupérer ou créer les préférences
    let preferences = await prisma.preferences.findUnique({
      where: { utilisateurId: utilisateur.id },
    });

    if (!preferences) {
      preferences = await prisma.preferences.create({
        data: {
          utilisateurId: utilisateur.id,
        },
      });
    }

    // Parser les aliments préférés depuis JSON
    let alimentsPreferes: string[] = [];
    if (preferences.alimentsPreferes) {
      try {
        alimentsPreferes = JSON.parse(preferences.alimentsPreferes);
      } catch (e) {
        console.error("Erreur lors du parsing des aliments préférés:", e);
      }
    }

    // Parser les allergies depuis JSON
    let allergies: string[] = [];
    if (preferences.allergenes) {
      try {
        allergies = JSON.parse(preferences.allergenes);
      } catch (e) {
        console.error("Erreur lors du parsing des allergies:", e);
      }
    }

    return NextResponse.json<ApiResponse>({
      data: {
        alimentsPreferes,
        allergies,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour les préférences de l'utilisateur
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
    const validation = preferencesSchema.safeParse(body);

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

    // Récupérer ou créer les préférences
    let preferences = await prisma.preferences.findUnique({
      where: { utilisateurId: utilisateur.id },
    });

    const alimentsPreferesJson = validation.data.alimentsPreferes
      ? JSON.stringify(validation.data.alimentsPreferes)
      : preferences?.alimentsPreferes || null;

    const allergiesJson = validation.data.allergies
      ? JSON.stringify(validation.data.allergies)
      : preferences?.allergenes || null;

    const updateData: {
      alimentsPreferes?: string | null;
      allergenes?: string | null;
    } = {};

    if (validation.data.alimentsPreferes !== undefined) {
      updateData.alimentsPreferes = alimentsPreferesJson;
    }
    if (validation.data.allergies !== undefined) {
      updateData.allergenes = allergiesJson;
    }

    if (preferences) {
      preferences = await prisma.preferences.update({
        where: { id: preferences.id },
        data: updateData,
      });
    } else {
      preferences = await prisma.preferences.create({
        data: {
          utilisateurId: utilisateur.id,
          alimentsPreferes: alimentsPreferesJson,
          allergenes: allergiesJson,
        },
      });
    }

    // Parser les allergies pour la réponse
    let allergies: string[] = [];
    if (preferences.allergenes) {
      try {
        allergies = JSON.parse(preferences.allergenes);
      } catch (e) {
        console.error("Erreur lors du parsing des allergies:", e);
      }
    }

    return NextResponse.json<ApiResponse>({
      data: {
        alimentsPreferes: validation.data.alimentsPreferes !== undefined 
          ? (validation.data.alimentsPreferes || [])
          : (preferences.alimentsPreferes ? JSON.parse(preferences.alimentsPreferes) : []),
        allergies: validation.data.allergies !== undefined
          ? (validation.data.allergies || [])
          : allergies,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

