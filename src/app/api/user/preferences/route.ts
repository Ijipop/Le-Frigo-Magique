import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { logger } from "../../../../../lib/utils/logger";
import { UnauthorizedError, NotFoundError, ValidationError, withErrorHandling } from "../../../../../lib/utils/apiError";
import { z } from "zod";
import type { ApiResponse } from "../../../../../lib/types/api";

const preferencesSchema = z.object({
  alimentsPreferes: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  codePostal: z.string().optional().nullable(),
});

// GET - Récupérer les préférences de l'utilisateur
export const GET = withErrorHandling(async () => {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const utilisateur = await getOrCreateUser(userId);
  if (!utilisateur) {
    throw new NotFoundError("Utilisateur non trouvé ou non créé");
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
        logger.error("Erreur lors du parsing des aliments préférés", e instanceof Error ? e : new Error(String(e)));
      }
    }

    // Parser les allergies depuis JSON
    let allergies: string[] = [];
    if (preferences.allergenes) {
      try {
        allergies = JSON.parse(preferences.allergenes);
      } catch (e) {
        logger.error("Erreur lors du parsing des allergies", e instanceof Error ? e : new Error(String(e)));
      }
    }

  return NextResponse.json<ApiResponse>({
    data: {
      alimentsPreferes,
      allergies,
      codePostal: preferences.codePostal || null,
    },
  });
});

// PUT - Mettre à jour les préférences de l'utilisateur
export const PUT = withErrorHandling(async (req: Request) => {
  const { userId } = await auth();
  if (!userId) {
    throw new UnauthorizedError();
  }

  const body = await req.json();
  const validation = preferencesSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Erreur de validation", validation.error.issues);
  }

  const utilisateur = await getOrCreateUser(userId);
  if (!utilisateur) {
    throw new NotFoundError("Utilisateur non trouvé ou non créé");
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
      codePostal?: string | null;
    } = {};

    if (validation.data.alimentsPreferes !== undefined) {
      updateData.alimentsPreferes = alimentsPreferesJson;
    }
    if (validation.data.allergies !== undefined) {
      updateData.allergenes = allergiesJson;
    }
    if (validation.data.codePostal !== undefined) {
      // Normaliser le code postal : enlever les espaces et mettre en majuscules
      const codePostalNormalise = validation.data.codePostal
        ? validation.data.codePostal.replace(/\s+/g, "").toUpperCase()
        : null;
      updateData.codePostal = codePostalNormalise;
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
        logger.error("Erreur lors du parsing des allergies", e instanceof Error ? e : new Error(String(e)));
      }
    }

    // Parser les aliments préférés pour la réponse
    let alimentsPreferes: string[] = [];
    if (preferences.alimentsPreferes) {
      try {
        alimentsPreferes = JSON.parse(preferences.alimentsPreferes);
      } catch (e) {
        logger.error("Erreur lors du parsing des aliments préférés", e instanceof Error ? e : new Error(String(e)));
      }
    }

    return NextResponse.json<ApiResponse>({
      data: {
        alimentsPreferes: validation.data.alimentsPreferes !== undefined 
          ? (validation.data.alimentsPreferes || [])
          : alimentsPreferes,
        allergies: validation.data.allergies !== undefined
          ? (validation.data.allergies || [])
          : allergies,
        codePostal: validation.data.codePostal !== undefined
          ? (validation.data.codePostal ? validation.data.codePostal.replace(/\s+/g, "").toUpperCase() : null)
          : (preferences.codePostal || null),
      },
    });
});

