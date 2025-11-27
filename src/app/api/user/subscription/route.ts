import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";

// GET - Récupérer le statut d'abonnement de l'utilisateur
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
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
  } catch (error) {
    console.error("Erreur lors de la récupération du statut d'abonnement:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

