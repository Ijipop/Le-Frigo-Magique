import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { isPremium } from "../../../../../lib/utils/premium";
import { UnauthorizedError, InternalServerError, withErrorHandling } from "../../../../../lib/utils/apiError";

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

  // Utiliser la fonction isPremium() qui vérifie lifetime, Stripe et legacy
  const premiumStatus = await isPremium(utilisateur.id);

  return NextResponse.json({
    isPremium: premiumStatus.isPremium,
    source: premiumStatus.source,
    premiumUntil: premiumStatus.premiumUntil,
    isExpired: premiumStatus.isExpired,
  });
});

