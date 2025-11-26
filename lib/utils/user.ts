import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "../prisma";

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
        console.error("❌ Impossible de récupérer les infos de l'utilisateur depuis Clerk");
        return null;
      }

      const email =
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        clerkUser.primaryEmailAddress?.emailAddress;

      if (!email) {
        console.error("❌ Pas d'email trouvé pour l'utilisateur Clerk");
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

      console.log(`✅ Utilisateur créé automatiquement dans Prisma: ${email}`);
    } catch (error) {
      console.error("❌ Erreur lors de la création automatique de l'utilisateur:", error);
      return null;
    }
  }

  return utilisateur;
}

