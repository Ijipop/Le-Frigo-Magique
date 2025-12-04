
import { prisma } from "../prisma";

export interface PremiumStatus {
  isPremium: boolean;
  source: "lifetime" | "stripe" | "legacy" | null;
  premiumUntil: Date | null;
  isExpired: boolean;
}

/**
 * Vérifie si un utilisateur a le statut premium
 * Priorité : Lifetime > Stripe > Legacy
 * 
 * @param utilisateurId - L'ID de l'utilisateur Prisma
 * @returns Le statut premium de l'utilisateur
 */
export async function isPremium(
  utilisateurId: string
): Promise<PremiumStatus> {
  // 1. Récupérer les préférences (lifetime)
  const preferences = await prisma.preferences.findUnique({
    where: { utilisateurId },
    select: {
      isLifetimePremium: true,
      premiumSince: true,
      isPremium: true, // Legacy
      premiumUntil: true, // Legacy
    },
  });

  // 2. Lifetime premium = toujours premium (priorité absolue)
  if (preferences?.isLifetimePremium) {
    return {
      isPremium: true,
      source: "lifetime",
      premiumUntil: null, // Lifetime = pas de date d'expiration
      isExpired: false,
    };
  }

  // 3. Vérifier Stripe (abonnement actif)
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    select: {
      stripeSubId: true,
    },
  });

  if (utilisateur?.stripeSubId) {
    // Vérifier dans la table Subscription si elle existe
    // (on utilise try/catch car la table peut ne pas exister encore)
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubId: utilisateur.stripeSubId },
        select: {
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      });

      if (subscription) {
        const isActive =
          subscription.status === "active" &&
          !subscription.cancelAtPeriodEnd &&
          (!subscription.currentPeriodEnd ||
            subscription.currentPeriodEnd > new Date());

        return {
          isPremium: isActive,
          source: isActive ? "stripe" : null,
          premiumUntil: subscription.currentPeriodEnd,
          isExpired: !isActive, // Cohérent avec la logique legacy
        };
      }
    } catch (error) {
      // Vérifier si l'erreur est spécifiquement liée à la table qui n'existe pas
      // Erreurs Prisma typiques pour table manquante :
      // - P2021: Table does not exist
      // - P2025: Record not found (mais ce n'est pas une erreur de table manquante)
      // - Erreurs SQL avec "does not exist" ou "table" dans le message
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      
      // Vérifier si c'est une erreur de table manquante
      const isTableMissingError = 
        errorCode === "P2021" || // Prisma: Table does not exist
        errorMessage.toLowerCase().includes("does not exist") ||
        errorMessage.toLowerCase().includes("table") && errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("relation") && errorMessage.toLowerCase().includes("does not exist");
      
      if (!isTableMissingError) {
        // Ce n'est pas une erreur de table manquante, re-lancer l'erreur
        // Cela peut être une erreur de connexion, timeout, etc.
        throw error;
      }
      
      // Si c'est vraiment une erreur de table manquante, continuer avec le fallback
      // (pour la transition - à améliorer avec les webhooks Stripe)
    }

    // Si pas de table Subscription, vérifier juste la présence de stripeSubId
    // (pour la transition - à améliorer avec les webhooks Stripe)
    return {
      isPremium: true,
      source: "stripe",
      premiumUntil: null, // À mettre à jour via webhook Stripe
      isExpired: false,
    };
  }

  // 4. Legacy : vérifier isPremium dans Preferences (pour migration)
  if (preferences?.isPremium) {
    const isActive =
      !preferences.premiumUntil ||
      new Date(preferences.premiumUntil) > new Date();

    return {
      isPremium: isActive,
      source: "legacy",
      premiumUntil: preferences.premiumUntil,
      isExpired: !isActive,
    };
  }

  // 5. Pas premium
  return {
    isPremium: false,
    source: null,
    premiumUntil: null,
    isExpired: false,
  };
}

/**
 * Version synchrone (si vous avez déjà les données en mémoire)
 * Utile pour éviter des requêtes DB supplémentaires
 * 
 * @param user - L'utilisateur avec ses relations chargées
 * @returns true si l'utilisateur est premium
 */
export function isPremiumSync(
  user: {
    preferences?: {
      isLifetimePremium?: boolean;
      isPremium?: boolean;
      premiumUntil?: Date | null;
    } | null;
    stripeSubId?: string | null;
  } | null
): boolean {
  if (!user) return false;

  // Lifetime premium (priorité absolue)
  if (user.preferences?.isLifetimePremium) return true;

  // Stripe
  if (user.stripeSubId) return true;

  // Legacy
  if (user.preferences?.isPremium) {
    if (!user.preferences.premiumUntil) return true;
    return new Date(user.preferences.premiumUntil) > new Date();
  }

  return false;
}

/**
 * Récupère le statut premium avec les données utilisateur déjà chargées
 * Évite les requêtes DB supplémentaires si vous avez déjà les données
 */
export function getPremiumStatusFromUser(
  user: {
    preferences?: {
      isLifetimePremium?: boolean;
      isPremium?: boolean;
      premiumUntil?: Date | null;
    } | null;
    stripeSubId?: string | null;
  } | null
): PremiumStatus {
  if (!user) {
    return {
      isPremium: false,
      source: null,
      premiumUntil: null,
      isExpired: false,
    };
  }

  // Lifetime premium
  if (user.preferences?.isLifetimePremium) {
    return {
      isPremium: true,
      source: "lifetime",
      premiumUntil: null,
      isExpired: false,
    };
  }

  // Stripe
  if (user.stripeSubId) {
    return {
      isPremium: true,
      source: "stripe",
      premiumUntil: null, // Nécessite la table Subscription pour avoir la vraie date
      isExpired: false,
    };
  }

  // Legacy
  if (user.preferences?.isPremium) {
    const premiumUntil = user.preferences.premiumUntil ?? null;
    const isActive =
      !premiumUntil ||
      new Date(premiumUntil) > new Date();

    return {
      isPremium: isActive,
      source: "legacy",
      premiumUntil: premiumUntil,
      isExpired: !isActive,
    };
  }

  return {
    isPremium: false,
    source: null,
    premiumUntil: null,
    isExpired: false,
  };
}

