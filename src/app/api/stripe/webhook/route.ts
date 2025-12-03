import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { logger } from "../../../../../lib/utils/logger";

export const runtime = "nodejs";

/**
 * Initialise Stripe de manière sécurisée
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
 * POST - Webhook Stripe pour gérer les événements d'abonnement
 */
export async function POST(req: Request) {
  const stripe = getStripeInstance();
  if (!stripe) {
    logger.error("STRIPE_SECRET_KEY n'est pas configurée pour le webhook", undefined, {});
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET n'est pas configurée", undefined, {});
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    logger.error("Signature Stripe manquante dans les headers", undefined, {});
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    logger.error("Erreur lors de la vérification du webhook Stripe", err instanceof Error ? err : new Error(String(err)), {
      message: err.message,
    });
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  logger.info("Webhook Stripe reçu", {
    type: event.type,
    id: event.id,
  });

  try {
    // Gérer les différents types d'événements
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Récupérer le clerkUserId depuis les metadata
        const clerkUserId = session.metadata?.clerkUserId;
        if (!clerkUserId) {
          logger.warn("checkout.session.completed sans clerkUserId dans metadata", {
            sessionId: session.id,
          });
          break;
        }

        // Trouver l'utilisateur Prisma via authUserId (Clerk)
        const utilisateur = await prisma.utilisateur.findUnique({
          where: { authUserId: clerkUserId },
        });

        if (!utilisateur) {
          logger.warn("Utilisateur non trouvé pour clerkUserId", {
            clerkUserId,
            sessionId: session.id,
          });
          break;
        }

        // Si c'est un abonnement, récupérer les détails
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = typeof session.subscription === "string" 
            ? session.subscription 
            : session.subscription.id;

          // Récupérer l'abonnement complet depuis Stripe
          const subscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = typeof subscription.customer === "string" 
            ? subscription.customer 
            : subscription.customer.id;

          // Mettre à jour l'utilisateur avec stripeCustomerId et stripeSubId
          await prisma.utilisateur.update({
            where: { id: utilisateur.id },
            data: {
              stripeCustomerId: customerId,
              stripeSubId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || null,
            } as any, // Type assertion nécessaire car Prisma Client peut ne pas avoir rafraîchi
          });

          // Créer ou mettre à jour l'entrée dans la table Subscription
          const currentPeriodEnd = (subscription as any).current_period_end 
            ? new Date((subscription as any).current_period_end * 1000) 
            : null;

          await (prisma as any).subscription.upsert({
            where: { stripeSubId: subscription.id },
            update: {
              status: subscription.status,
              currentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
              stripePriceId: subscription.items.data[0]?.price.id || null,
            },
            create: {
              utilisateurId: utilisateur.id,
              stripeSubId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || null,
              status: subscription.status,
              currentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            },
          });

          logger.info("Abonnement créé/mis à jour", {
            utilisateurId: utilisateur.id,
            subscriptionId: subscription.id,
            status: subscription.status,
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Trouver l'utilisateur via stripeCustomerId
        const customerId = typeof subscription.customer === "string" 
          ? subscription.customer 
          : subscription.customer.id;

        let utilisateur = await prisma.utilisateur.findFirst({
          where: { stripeCustomerId: customerId } as any,
        });

        // Si l'utilisateur n'est pas trouvé via stripeCustomerId, essayer de récupérer le customer depuis Stripe
        // pour voir s'il a des metadata avec clerkUserId ou utiliser l'email (pour les tests)
        if (!utilisateur) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && typeof customer === "object") {
              // 1. Essayer avec clerkUserId dans les metadata
              const clerkUserId = (customer as any).metadata?.clerkUserId;
              if (clerkUserId) {
                utilisateur = await prisma.utilisateur.findUnique({
                  where: { authUserId: clerkUserId },
                });
              }
              
              // 2. Si pas trouvé, essayer avec l'email du customer
              if (!utilisateur && (customer as any).email) {
                utilisateur = await prisma.utilisateur.findUnique({
                  where: { email: (customer as any).email },
                });
              }
              
              // Si on trouve l'utilisateur, mettre à jour son stripeCustomerId
              if (utilisateur) {
                await prisma.utilisateur.update({
                  where: { id: utilisateur.id },
                  data: {
                    stripeCustomerId: customerId,
                  } as any,
                });
                logger.info("Utilisateur trouvé et stripeCustomerId mis à jour", {
                  utilisateurId: utilisateur.id,
                  customerId,
                  method: clerkUserId ? "clerkUserId" : "email",
                });
              }
            }
          } catch (error) {
            logger.warn("Erreur lors de la récupération du customer Stripe", {
              customerId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (!utilisateur) {
          logger.warn("Utilisateur non trouvé pour stripeCustomerId", {
            customerId,
            subscriptionId: subscription.id,
          });
          break;
        }

        // Mettre à jour l'utilisateur
        await prisma.utilisateur.update({
          where: { id: utilisateur.id },
          data: {
            stripeSubId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id || null,
          } as any, // Type assertion nécessaire
        });

        // Créer ou mettre à jour l'entrée dans la table Subscription
        // Note: current_period_end peut être dans subscription.items.data[0].current_period_end ou subscription.current_period_end
        const currentPeriodEndValue = (subscription as any).current_period_end 
          || (subscription.items?.data?.[0] as any)?.current_period_end
          || null;
        const currentPeriodEnd = currentPeriodEndValue 
          ? new Date(currentPeriodEndValue * 1000) 
          : null;

        await (prisma as any).subscription.upsert({
          where: { stripeSubId: subscription.id },
            update: {
              status: subscription.status,
              currentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
              stripePriceId: subscription.items.data[0]?.price.id || null,
            },
            create: {
              utilisateurId: utilisateur.id,
              stripeSubId: subscription.id,
              stripePriceId: subscription.items.data[0]?.price.id || null,
              status: subscription.status,
              currentPeriodEnd: currentPeriodEnd,
              cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            },
        });

        logger.info("Abonnement créé/mis à jour via webhook", {
          utilisateurId: utilisateur.id,
          subscriptionId: subscription.id,
          status: subscription.status,
          eventType: event.type,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Trouver l'abonnement dans la base de données
        const dbSubscription = await (prisma as any).subscription.findUnique({
          where: { stripeSubId: subscription.id },
          include: { utilisateur: true },
        });

        if (dbSubscription) {
          // Mettre à jour le statut à "canceled"
          await (prisma as any).subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: "canceled",
            },
          });

          // Retirer stripeSubId de l'utilisateur (mais garder stripeCustomerId)
          await prisma.utilisateur.update({
            where: { id: dbSubscription.utilisateurId },
            data: {
              stripeSubId: null,
            } as any, // Type assertion nécessaire
          });

          logger.info("Abonnement annulé", {
            utilisateurId: dbSubscription.utilisateurId,
            subscriptionId: subscription.id,
          });
        }

        break;
      }

      default:
        logger.info("Événement Stripe non géré", {
          type: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Erreur lors du traitement du webhook Stripe", error instanceof Error ? error : new Error(String(error)), {
      eventType: event.type,
      eventId: event.id,
    });
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

