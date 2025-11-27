import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "../prisma";
import { logger } from "./logger";

/**
 * Récupère ou crée un utilisateur Prisma à partir de l'ID Clerk
 * @param clerkUserId - L'ID de l'utilisateur Clerk
 * @returns L'utilisateur Prisma ou null si la création échoue
 */
export async function getOrCreateUser(clerkUserId: string) {
  // Chercher l'utilisateur existant
  let utilisateur = await prisma.utilisateur.findUnique({
    where: { authUserId: clerkUserId },
  });

  // Si l'utilisateur n'existe pas, le créer
  if (!utilisateur) {
    try {
      const clerkUser = await currentUser();

      if (!clerkUser) {
        logger.error("Impossible de récupérer les infos de l'utilisateur depuis Clerk", undefined, { clerkUserId });
        return null;
      }

      const email =
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        clerkUser.primaryEmailAddress?.emailAddress;

      if (!email) {
        logger.error("Pas d'email trouvé pour l'utilisateur Clerk", undefined, { clerkUserId });
        return null;
      }

      const nom =
        clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.firstName || clerkUser.lastName || null;

      utilisateur = await prisma.utilisateur.create({
        data: {
          authUserId: clerkUserId,
          email: email,
          nom: nom,
        },
      });

      logger.info(`Utilisateur créé automatiquement dans Prisma`, { email, clerkUserId });
    } catch (error) {
      logger.error("Erreur lors de la création automatique de l'utilisateur", error instanceof Error ? error : new Error(String(error)), { clerkUserId });
      return null;
    }
  }

  return utilisateur;
}

