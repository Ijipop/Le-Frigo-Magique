import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { UnauthorizedError, InternalServerError, withErrorHandling } from "../../../../../lib/utils/apiError";
import { logger } from "../../../../../lib/utils/logger";

export const runtime = "nodejs";

/**
 * Initialise Stripe de manière sécurisée
 * Retourne null si la clé n'est pas configurée (pour éviter les erreurs au build)
 */
function getStripeInstance(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  
  return new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover",
  });
}

/**
 * POST - Créer une session de checkout Stripe pour l'abonnement premium
 */
export const POST = withErrorHandling(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError("Vous devez être connecté pour accéder à cette fonctionnalité");
  }

  // Vérifier que les variables d'environnement sont configurées
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.error("STRIPE_SECRET_KEY n'est pas configurée", undefined, {});
    throw new InternalServerError("Configuration Stripe manquante");
  }

  if (!process.env.STRIPE_PRICE_ID) {
    logger.error("STRIPE_PRICE_ID n'est pas configurée", undefined, {});
    throw new InternalServerError("Configuration Stripe manquante");
  }

  // Initialiser Stripe
  const stripe = getStripeInstance();
  if (!stripe) {
    throw new InternalServerError("Impossible d'initialiser Stripe");
  }

  // Récupérer l'URL d'origine pour les redirections
  const origin = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      metadata: {
        clerkUserId: userId,
      },
      // Permettre la collecte d'email si nécessaire
      customer_email: undefined, // Stripe récupérera l'email depuis Clerk via les webhooks
    });

    logger.info("Session Stripe Checkout créée", {
      sessionId: session.id,
      userId,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    // Détecter les erreurs Stripe (elles ont une structure spécifique)
    // Les erreurs Stripe sont des instances de Stripe.errors.StripeError
    // Elles ont généralement: type, code, message, raw
    const isStripeError = error && 
      typeof error === "object" && 
      ("type" in error || "code" in error || (error instanceof Error && (error.message.includes("No such price") || error.message.includes("Stripe"))));
    
    let errorMessage = "Erreur lors de la création de la session de paiement";
    let errorDetails: Record<string, any> = {};

    if (isStripeError) {
      const stripeError = error as any;
      // Les erreurs Stripe ont généralement une propriété 'message' directe
      // Exemple: "No such price: 'price_xxx'"
      errorMessage = stripeError.message || 
        stripeError.raw?.message || 
        `Erreur Stripe: ${stripeError.type || stripeError.code || "Erreur inconnue"}`;
      
      // Sérialiser uniquement les propriétés simples et sérialisables
      if (stripeError.type) errorDetails.type = String(stripeError.type);
      if (stripeError.code) errorDetails.code = String(stripeError.code);
      if (stripeError.message) errorDetails.message = String(stripeError.message);
      
      logger.error("Erreur Stripe lors de la création de la session Checkout", error instanceof Error ? error : new Error(errorMessage), {
        userId,
        isStripeError: true,
        stripeErrorType: stripeError.type,
        stripeErrorCode: stripeError.code,
        stripeErrorMessage: stripeError.message,
      });
    } else if (error instanceof Error) {
      errorMessage = error.message || "Erreur lors de la création de la session de paiement";
      errorDetails.message = errorMessage;
      logger.error("Erreur lors de la création de la session Stripe Checkout", error, {
        userId,
        isStripeError: false,
      });
    } else {
      errorMessage = String(error) || "Erreur inconnue lors de la création de la session de paiement";
      errorDetails.error = errorMessage;
      logger.error("Erreur inconnue lors de la création de la session Stripe Checkout", new Error(errorMessage), {
        userId,
      });
    }

    // S'assurer que le message n'est jamais vide
    if (!errorMessage || errorMessage.trim() === "") {
      errorMessage = "Erreur lors de la création de la session de paiement";
    }

    // Retourner une erreur avec le message détaillé
    // Le message sera correctement sérialisé par handleApiError
    throw new InternalServerError(errorMessage, errorDetails);
  }
});

