import { z } from "zod";

export const createLigneListeSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(200),
  quantite: z.number().positive("La quantité doit être positive"),
  unite: z.string().nullable().optional(),
  prixEstime: z.number().nonnegative("Le prix doit être positif ou zéro").optional().nullable(),
});

export const updateLigneListeSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(200).optional(),
  quantite: z.number().positive("La quantité doit être positive").optional(),
  unite: z.string().nullable().optional(),
  prixEstime: z.number().nonnegative("Le prix doit être positif ou zéro").optional().nullable(),
});

