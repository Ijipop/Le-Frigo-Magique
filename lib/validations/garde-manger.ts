import { z } from "zod";

// Schéma de validation pour créer un article
export const createArticleSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim(),
  quantite: z
    .number("La quantité doit être un nombre")
    .positive("La quantité doit être positive")
    .max(1000000, "La quantité est trop élevée"),
  unite: z
    .string()
    .max(20, "L'unité ne peut pas dépasser 20 caractères")
    .trim()
    .optional()
    .nullable(),
});

// Schéma de validation pour mettre à jour un article
export const updateArticleSchema = z.object({
  nom: z
    .string()
    .min(1, "Le nom est requis")
    .max(100, "Le nom ne peut pas dépasser 100 caractères")
    .trim()
    .optional(),
  quantite: z
    .number("La quantité doit être un nombre")
    .positive("La quantité doit être positive")
    .max(1000000, "La quantité est trop élevée")
    .optional(),
  unite: z
    .string()
    .max(20, "L'unité ne peut pas dépasser 20 caractères")
    .trim()
    .optional()
    .nullable(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

