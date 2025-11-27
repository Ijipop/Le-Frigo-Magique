import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { UnauthorizedError, NotFoundError, InternalServerError, withErrorHandling } from "../../../../../lib/utils/apiError";

// GET - Récupérer le statut d'abonnement de l'utilisateur
export const GET = withErrorHandling(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  const utilisateur = await getOrCreateUser(userId);

  if (!utilisateur) {
    throw new InternalServerError("Impossible de récupérer l'utilisateur");
  }

  const preferences = await prisma.preferences.findUnique({
    where: { utilisateurId: utilisateur.id },
    select: {
      isPremium: true,
      premiumUntil: true,
    },
  });

  const isPremium = preferences?.isPremium ?? false;
  const premiumUntil = preferences?.premiumUntil;
  const isActive = isPremium && premiumUntil && new Date(premiumUntil) > new Date();

  return NextResponse.json({
    isPremium: isActive,
    premiumUntil: premiumUntil,
    isExpired: isPremium && premiumUntil && new Date(premiumUntil) <= new Date(),
  });
});

