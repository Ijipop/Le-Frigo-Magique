import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { UnauthorizedError, InternalServerError, withErrorHandling } from "../../../../lib/utils/apiError";
import { logger } from "../../../../lib/utils/logger";

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export const runtime = "nodejs";

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
    logger.error("Erreur lors de la création de la session Stripe Checkout", error instanceof Error ? error : new Error(String(error)), {
      userId,
    });

    throw new InternalServerError("Erreur lors de la création de la session de paiement");
  }
});

