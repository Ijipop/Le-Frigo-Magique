/**
 * Système de rate limiting simple pour protéger les routes API
 * 
 * En production, utilisez un service comme Upstash Redis pour un rate limiting distribué
 * Pour l'instant, on utilise un cache en mémoire (Map) qui fonctionne pour un seul serveur
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";

interface RateLimitConfig {
  maxRequests: number; // Nombre maximum de requêtes
  windowMs: number; // Fenêtre de temps en millisecondes
  identifier?: string; // Identifiant personnalisé (userId, IP, etc.)
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Cache en mémoire (Map) pour stocker les compteurs
// En production avec plusieurs serveurs, utilisez Redis
const rateLimitCache = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (entry.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Obtient l'identifiant pour le rate limiting
 * Priorité : userId > IP address
 */
async function getRateLimitIdentifier(userId?: string | null): Promise<string> {
  if (userId) {
    return `user:${userId}`;
  }

  // Récupérer l'IP depuis les headers
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

  return `ip:${ip}`;
}

/**
 * Vérifie si une requête dépasse la limite de taux
 * @param config Configuration du rate limiting
 * @returns null si OK, Response avec erreur 429 si limite dépassée
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  userId?: string | null
): Promise<Response | null> {
  const identifier = config.identifier || (await getRateLimitIdentifier(userId));
  const now = Date.now();
  const entry = rateLimitCache.get(identifier);

  // Si pas d'entrée ou si la fenêtre est expirée, créer une nouvelle entrée
  if (!entry || entry.resetAt < now) {
    rateLimitCache.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null; // OK
  }

  // Si on a atteint la limite
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return NextResponse.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        message: "Trop de requêtes. Veuillez réessayer plus tard.",
        retryAfter, // Secondes avant de pouvoir réessayer
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(entry.resetAt).toISOString(),
        },
      }
    );
  }

  // Incrémenter le compteur
  entry.count++;
  rateLimitCache.set(identifier, entry);

  // Ajouter les headers de rate limit à la réponse
  const remaining = config.maxRequests - entry.count;
  
  // Note: On ne peut pas ajouter des headers ici car on retourne null
  // Les headers seront ajoutés dans le middleware ou dans la route
  
  return null; // OK
}

/**
 * Wrapper pour ajouter le rate limiting à une route API
 * 
 * @example
 * export const GET = withRateLimit(
 *   { maxRequests: 10, windowMs: 60000 }, // 10 requêtes par minute
 *   async (req: Request) => {
 *     // ... votre code
 *   }
 * );
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
  config: RateLimitConfig,
  handler: T,
  getUserId?: () => Promise<string | null>
): T {
  return (async (...args: Parameters<T>) => {
    const userId = getUserId ? await getUserId() : null;
    const rateLimitResponse = await checkRateLimit(config, userId);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(...args);
  }) as T;
}

/**
 * Configurations prédéfinies pour différents types de routes
 */
export const RateLimitConfigs = {
  // Routes publiques (plus restrictives)
  PUBLIC: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Routes authentifiées (moins restrictives)
  AUTHENTICATED: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Routes de recherche (très restrictives car coûteuses)
  SEARCH: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Routes de création/modification (modérées)
  MUTATION: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Routes très coûteuses (comme la recherche de rabais)
  EXPENSIVE: {
    maxRequests: 15, // Augmenté de 5 à 15 pour éviter les erreurs 429 fréquentes
    windowMs: 60 * 1000, // 1 minute
  },
} as const;



