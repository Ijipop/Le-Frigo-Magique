/**
 * Classes d'erreurs personnalisées pour l'API
 * Permet une gestion d'erreurs centralisée et cohérente
 */

import { logger } from "./logger";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    // Maintient le stack trace pour le debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

// Erreurs spécifiques pour différents cas
export class UnauthorizedError extends ApiError {
  constructor(message = "Non autorisé", details?: unknown) {
    super(401, message, "UNAUTHORIZED", details);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Ressource non trouvée", details?: unknown) {
    super(404, message, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Erreur de validation", details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Accès interdit", details?: unknown) {
    super(403, message, "FORBIDDEN", details);
    this.name = "ForbiddenError";
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Erreur serveur interne", details?: unknown) {
    super(500, message, "INTERNAL_ERROR", details);
    this.name = "InternalServerError";
  }
}

/**
 * Handler d'erreurs centralisé pour les routes API
 * Convertit toutes les erreurs en réponses HTTP standardisées
 */
export function handleApiError(error: unknown): Response {
  // Si c'est déjà une ApiError, on la retourne directement
  if (error instanceof ApiError) {
    logger.warn(`Erreur API: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    });

    return new Response(
      JSON.stringify({
        error: error.code || "API_ERROR",
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Si c'est une erreur Zod (validation)
  if (error && typeof error === "object" && "issues" in error) {
    logger.warn("Erreur de validation Zod", { error });
    return new Response(
      JSON.stringify({
        error: "VALIDATION_ERROR",
        message: "Erreur de validation des données",
        details: error,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Erreur inconnue - log et retourner une erreur générique
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error("Erreur inattendue dans l'API", error instanceof Error ? error : new Error(errorMessage), {
    stack: errorStack,
  });

  return new Response(
    JSON.stringify({
      error: "INTERNAL_ERROR",
      message: "Une erreur inattendue s'est produite",
      // En production, ne pas exposer les détails de l'erreur
      ...(process.env.NODE_ENV === "development" && { details: errorMessage }),
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Wrapper pour les handlers de route API
 * Capture automatiquement les erreurs et les convertit en réponses HTTP
 * 
 * @example
 * export const GET = withErrorHandling(async (req: Request) => {
 *   const { userId } = await auth();
 *   if (!userId) throw new UnauthorizedError();
 *   // ... reste du code
 * });
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

