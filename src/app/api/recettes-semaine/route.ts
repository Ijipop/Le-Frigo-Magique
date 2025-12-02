import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { z } from "zod";
import type { ApiResponse } from "../../../../lib/types/api";
import { getRecipeInformation } from "../../../../lib/utils/spoonacular";
import { normalizeIngredientName, matchIngredients } from "../../../../lib/utils/ingredientMatcher";
import { toGroceryItem, type SpoonacularIngredient } from "../../../../lib/ingredients/translateToFr";

// Runtime explicite pour Vercel (opérations DB complexes + parsing recettes)
export const runtime = "nodejs";

// Schéma simplifié pour éviter les problèmes de validation
const createRecetteSchema = z.object({
  titre: z.string().min(1, "Le titre est requis").max(200),
  url: z.string().url("L'URL doit être valide"),
  image: z.any().optional().nullable(),
  snippet: z.any().optional().nullable(),
  source: z.any().optional().nullable(),
  estimatedCost: z.any().optional().nullable(),
  servings: z.any().optional().nullable(),
  spoonacularId: z.number().optional().nullable(),
  detailedCost: z.any().optional().nullable(),
});

// GET - Récupérer les recettes de la semaine
export async function GET() {
  try {
    console.log("🔍 [API GET] Début de la récupération des recettes");
    
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ [API GET] Pas d'userId");
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    console.log("✅ [API GET] userId:", userId);

    console.log("👤 [API GET] Récupération/création de l'utilisateur...");
    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      console.error("❌ [API GET] Utilisateur non trouvé ou non créé");
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    console.log("✅ [API GET] Utilisateur trouvé:", utilisateur.id);

    console.log("📋 [API GET] Récupération des recettes depuis la base de données...");
    const recettes = await prisma.recetteSemaine.findMany({
      where: { utilisateurId: utilisateur.id },
      orderBy: { createdAt: "desc" },
    });
    console.log(`✅ [API GET] ${recettes.length} recette(s) trouvée(s)`);

    return NextResponse.json<ApiResponse>({
      data: recettes,
    });
  } catch (error) {
    console.error("❌ [API GET] ERREUR lors de la récupération des recettes:");
    console.error("❌ [API GET] Type d'erreur:", error?.constructor?.name);
    console.error("❌ [API GET] Erreur complète:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : "Unknown";
    
    console.error("❌ [API GET] Détails de l'erreur:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
    });
    
    // Si c'est une erreur Prisma, donner plus de détails
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("❌ [API GET] Code d'erreur Prisma:", (error as any).code);
      console.error("❌ [API GET] Meta Prisma:", (error as any).meta);
    }
    
    return NextResponse.json<ApiResponse>(
      { 
        error: "Erreur serveur", 
        details: errorMessage,
        // En développement, inclure plus de détails
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

// POST - Ajouter une recette à la semaine
export async function POST(req: Request) {
  try {
    console.log("🚀 [API] POST /api/recettes-semaine - Début");
    
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ [API] Pas d'userId");
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    console.log("✅ [API] userId:", userId);

    let body: any;
    try {
      body = await req.json();
      console.log("📥 [API] Données reçues:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("❌ [API] Erreur lors du parsing JSON:", parseError);
      return NextResponse.json<ApiResponse>(
        { error: "Données JSON invalides" },
        { status: 400 }
      );
    }
    
    // Validation basique des champs requis
    if (!body.titre || typeof body.titre !== 'string' || body.titre.trim().length === 0) {
      console.error("❌ [API] Titre invalide:", body.titre);
      return NextResponse.json<ApiResponse>(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }

    if (!body.url || typeof body.url !== 'string' || !body.url.startsWith('http')) {
      console.error("❌ [API] URL invalide:", body.url);
      return NextResponse.json<ApiResponse>(
        { error: "L'URL est requise et doit être valide" },
        { status: 400 }
      );
    }

    // Normaliser les valeurs avant validation
    const normalizedBody: any = {
      titre: body.titre.trim(),
      url: body.url.trim(),
    };
    
    // Gérer les champs optionnels - toujours les inclure pour que Zod puisse les valider
    normalizedBody.image = (body.image === "" || body.image === null || body.image === undefined) ? null : (typeof body.image === 'string' ? body.image : null);
    normalizedBody.snippet = (body.snippet === "" || body.snippet === null || body.snippet === undefined) ? null : (typeof body.snippet === 'string' ? body.snippet : null);
    normalizedBody.source = (body.source === "" || body.source === null || body.source === undefined) ? null : (typeof body.source === 'string' ? body.source : null);
    normalizedBody.estimatedCost = (body.estimatedCost === null || body.estimatedCost === undefined || (typeof body.estimatedCost === 'number' && body.estimatedCost <= 0)) ? null : (typeof body.estimatedCost === 'number' ? body.estimatedCost : null);
    normalizedBody.servings = (body.servings === null || body.servings === undefined || (typeof body.servings === 'number' && (body.servings <= 0 || body.servings > 50))) ? null : (typeof body.servings === 'number' ? body.servings : null);
    
    console.log("📥 [API] Données normalisées:", JSON.stringify(normalizedBody, null, 2));
    
    const validation = createRecetteSchema.safeParse(normalizedBody);
    
    if (!validation.success) {
      console.error("❌ [API] Erreur de validation:", JSON.stringify(validation.error.issues, null, 2));
      console.error("❌ [API] Données qui ont échoué:", JSON.stringify(normalizedBody, null, 2));
      return NextResponse.json<ApiResponse>(
        {
          error: "Données invalides",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    console.log("✅ [API] Validation réussie");

    console.log("👤 [API] Récupération de l'utilisateur...");
    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      console.error("❌ [API] Utilisateur non trouvé");
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    console.log("✅ [API] Utilisateur trouvé:", utilisateur.id);

    // Vérifier si la recette existe déjà (par URL)
    console.log("🔍 [API] Vérification si la recette existe déjà...");
    const existing = await prisma.recetteSemaine.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        url: validation.data.url,
      },
    });

    if (existing) {
      console.log("⚠️ [API] Recette déjà existante");
      return NextResponse.json<ApiResponse>(
        { error: "Cette recette est déjà dans vos recettes de la semaine" },
        { status: 409 }
      );
    }
    console.log("✅ [API] Recette n'existe pas encore");

    // Normaliser les valeurs null/undefined/vides
    const normalizeValue = (val: string | null | undefined | ""): string | null => {
      if (val === null || val === undefined || val === "") {
        return null;
      }
      return val;
    };

    // Normaliser estimatedCost et servings - gérer les cas où ils sont des chaînes
    let estimatedCost: number | null = null;
    if (validation.data.estimatedCost !== null && validation.data.estimatedCost !== undefined) {
      if (typeof validation.data.estimatedCost === 'number') {
        estimatedCost = validation.data.estimatedCost > 0 ? validation.data.estimatedCost : null;
      } else if (typeof validation.data.estimatedCost === 'string') {
        const parsed = parseFloat(validation.data.estimatedCost);
        estimatedCost = !isNaN(parsed) && parsed > 0 ? parsed : null;
      }
    }

    let servings: number | null = null;
    if (validation.data.servings !== null && validation.data.servings !== undefined) {
      if (typeof validation.data.servings === 'number') {
        servings = validation.data.servings > 0 && validation.data.servings <= 50 ? validation.data.servings : null;
      } else if (typeof validation.data.servings === 'string') {
        const parsed = parseInt(validation.data.servings, 10);
        servings = !isNaN(parsed) && parsed > 0 && parsed <= 50 ? parsed : null;
      }
    }

    const recetteData: any = {
      utilisateurId: utilisateur.id,
      titre: validation.data.titre,
      url: validation.data.url,
      image: normalizeValue(validation.data.image),
      snippet: normalizeValue(validation.data.snippet),
      source: normalizeValue(validation.data.source),
      estimatedCost,
      servings,
    };
    
    // Ajouter spoonacularId seulement s'il existe et est un nombre
    if (body.spoonacularId && typeof body.spoonacularId === 'number') {
      recetteData.spoonacularId = body.spoonacularId;
    }
    
    console.log("💾 [API] Données à sauvegarder:", JSON.stringify(recetteData, null, 2));
    console.log("💾 [API] Types des données:", {
      utilisateurId: typeof recetteData.utilisateurId,
      titre: typeof recetteData.titre,
      url: typeof recetteData.url,
      image: typeof recetteData.image,
      snippet: typeof recetteData.snippet,
      source: typeof recetteData.source,
      estimatedCost: typeof recetteData.estimatedCost,
      servings: typeof recetteData.servings,
    });
    
    try {
      console.log("💾 [API] Tentative de création en base de données...");
      const recette = await prisma.recetteSemaine.create({
        data: recetteData,
      });
    
      console.log("✅ [API] Recette créée avec succès:", recette.id);

      // 🍴 NOUVEAU : Ajouter automatiquement les ingrédients à la liste d'épicerie
      let ingredientsAdded = false;
      console.log("🍴 [API] Vérification pour ajout automatique des ingrédients:", {
        hasSpoonacularId: !!body.spoonacularId,
        spoonacularId: body.spoonacularId,
        hasDetailedCost: !!body.detailedCost,
        hasUrl: !!body.url,
      });
      
      if (body.spoonacularId || body.detailedCost) {
        // Cas 1: Recette Spoonacular (avec spoonacularId ou detailedCost)
        try {
          console.log("🍴 [API] Tentative d'ajout des ingrédients à la liste d'épicerie...");
          const addedCount = await addSpoonacularIngredientsToListeEpicerie(
            utilisateur.id,
            body.spoonacularId,
            body.detailedCost
          );
          ingredientsAdded = addedCount > 0;
          console.log(`✅ [API] ${addedCount} ingrédient(s) ajouté(s) à la liste d'épicerie`);
        } catch (ingredientError) {
          console.error("❌ [API] Erreur lors de l'ajout des ingrédients à la liste d'épicerie:", ingredientError);
          // Ne pas faire échouer l'ajout de la recette si l'ajout des ingrédients échoue
        }
      } else if (body.url) {
        // Cas 2: Recette depuis favoris ou autre source - essayer d'extraire les ingrédients depuis l'URL
        try {
          console.log("🍴 [API] Tentative d'extraction des ingrédients depuis l'URL...");
          const { calculateDetailedRecipeCost } = await import("../../../../lib/utils/detailedRecipeCost");
          
          // Récupérer le code postal pour les prix
          const preferences = await prisma.preferences.findUnique({
            where: { utilisateurId: utilisateur.id },
          });
          const postalCode = preferences?.codePostal || undefined;
          
          // Extraire les ingrédients depuis l'URL
          console.log(`🔍 [API] Extraction des ingrédients depuis l'URL: ${body.url}`);
          const detailedCostResult = await calculateDetailedRecipeCost(body.url, postalCode);
          
          if (detailedCostResult.ingredients && detailedCostResult.ingredients.length > 0) {
            console.log(`✅ [API] ${detailedCostResult.ingredients.length} ingrédient(s) extrait(s) depuis l'URL`);
            console.log(`📋 [API] Ingrédients extraits:`, detailedCostResult.ingredients.map((ing: any) => `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`).join(', '));
            
            // Convertir le format DetailedCostResult vers le format attendu par addSpoonacularIngredientsToListeEpicerie
            // detailedCostResult.ingredients a: { name, quantity?: string, unit?: string, price, source }
            // On doit convertir vers: { name, amount: number, unit: string }
            const convertedDetailedCost = {
              ingredients: detailedCostResult.ingredients.map((ing: any, index: number) => {
                // Parser la quantité (peut être "2", "1/2", "500", etc.)
                let amount = 1;
                if (ing.quantity) {
                  // Essayer de parser la quantité
                  const quantityStr = ing.quantity.toString().trim();
                  // Gérer les fractions simples (ex: "1/2" = 0.5)
                  if (quantityStr.includes('/')) {
                    const [num, den] = quantityStr.split('/').map(Number);
                    if (!isNaN(num) && !isNaN(den) && den !== 0) {
                      amount = num / den;
                    }
                  } else {
                    const parsed = parseFloat(quantityStr);
                    if (!isNaN(parsed) && parsed > 0) {
                      amount = parsed;
                    }
                  }
                }
                
                // Nettoyer le nom de l'ingrédient (enlever les descriptions après virgule)
                // Ex: "8 medium sized shrimp, deveined, shells removed" -> "shrimp"
                let cleanName = ing.name;
                
                // Si le nom commence par un nombre, l'enlever (déjà dans quantity)
                cleanName = cleanName.replace(/^\d+\s+/, '');
                
                // Enlever les descriptions après virgule
                if (cleanName.includes(',')) {
                  cleanName = cleanName.split(',')[0].trim();
                }
                
                // Enlever les parenthèses et leur contenu
                cleanName = cleanName.replace(/\([^)]*\)/g, '').trim();
                
                // Enlever les mots de description courants
                const prepWords = ['medium', 'large', 'small', 'boneless', 'skinless', 'deveined', 'chopped', 'diced', 'sliced', 'minced', 'grated'];
                const words = cleanName.split(/\s+/);
                const filteredWords = words.filter((word: string) => {
                  const lowerWord = word.toLowerCase();
                  return !prepWords.includes(lowerWord) && 
                         !lowerWord.match(/^(sized|removed|to|into|bite|size)$/);
                });
                cleanName = filteredWords.join(' ').trim();
                
                return {
                  id: index, // Utiliser l'index comme ID
                  name: cleanName || ing.name, // Utiliser le nom nettoyé ou l'original
                  original: ing.name, // Garder l'original pour référence
                  amount: amount,
                  unit: ing.unit || "",
                };
              }),
            };
            
            console.log(`🔍 [API] Format converti: ${convertedDetailedCost.ingredients.length} ingrédient(s) prêt(s) à être ajoutés`);
            console.log(`📋 [API] Ingrédients convertis (avant traduction):`, convertedDetailedCost.ingredients.map((ing: any) => `${ing.amount} ${ing.unit || ''} ${ing.name} (original: ${ing.original})`).join(', '));
            
            // addSpoonacularIngredientsToListeEpicerie va traduire les ingrédients elle-même
            // On passe les ingrédients en anglais/original
            const addedCount = await addSpoonacularIngredientsToListeEpicerie(
              utilisateur.id,
              null,
              convertedDetailedCost
            );
            ingredientsAdded = addedCount > 0;
            console.log(`✅ [API] ${addedCount} ingrédient(s) ajouté(s) à la liste d'épicerie`);
          } else {
            console.log("ℹ️ [API] Aucun ingrédient trouvé dans la recette (detailedCostResult.ingredients est vide ou undefined)");
          }
        } catch (ingredientError) {
          const errorMessage = ingredientError instanceof Error ? ingredientError.message : String(ingredientError);
          const errorStack = ingredientError instanceof Error ? ingredientError.stack : undefined;
          console.error("❌ [API] Erreur lors de l'extraction des ingrédients depuis l'URL:", {
            error: errorMessage,
            stack: errorStack,
            url: body.url,
          });
          // Ne pas faire échouer l'ajout de la recette si l'extraction échoue
        }
      } else {
        console.log("ℹ️ [API] Pas de spoonacularId, detailedCost ni URL, pas d'ajout automatique d'ingrédients");
      }

      return NextResponse.json<ApiResponse>(
        {
          data: { ...recette, ingredientsAdded },
          message: "Recette ajoutée à la semaine",
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("❌ [API] Erreur lors de la création en base de données:", dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      const dbErrorStack = dbError instanceof Error ? dbError.stack : undefined;
      console.error("Détails de l'erreur DB:", { dbErrorMessage, dbErrorStack });
      
      // Si c'est une erreur de contrainte unique (recette déjà existante)
      if (dbErrorMessage.includes("Unique constraint") || dbErrorMessage.includes("duplicate key")) {
        return NextResponse.json<ApiResponse>(
          { error: "Cette recette est déjà dans vos recettes de la semaine" },
          { status: 409 }
        );
      }
      
      throw dbError; // Relancer pour être capturé par le catch externe
    }
  } catch (error) {
    console.error("❌ [API] ERREUR GLOBALE lors de l'ajout de la recette:");
    console.error("❌ [API] Type d'erreur:", error?.constructor?.name);
    console.error("❌ [API] Erreur complète:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : "Unknown";
    
    console.error("❌ [API] Détails de l'erreur:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
    });
    
    // Si c'est une erreur Prisma, donner plus de détails
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("❌ [API] Code d'erreur Prisma:", (error as any).code);
      console.error("❌ [API] Meta Prisma:", (error as any).meta);
    }
    
    return NextResponse.json<ApiResponse>(
      { 
        error: "Erreur serveur", 
        details: errorMessage,
        // En développement, inclure plus de détails
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une recette de la semaine
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const recetteId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    const utilisateur = await getOrCreateUser(userId);
    if (!utilisateur) {
      return NextResponse.json<ApiResponse>(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer toutes les recettes
    if (deleteAll) {
      const result = await prisma.recetteSemaine.deleteMany({
        where: {
          utilisateurId: utilisateur.id,
        },
      });

      return NextResponse.json<ApiResponse>({
        data: { success: true, deletedCount: result.count },
        message: `${result.count} recette${result.count > 1 ? "s" : ""} supprimée${result.count > 1 ? "s" : ""}`,
      });
    }

    // Supprimer une recette spécifique
    if (!recetteId) {
      return NextResponse.json<ApiResponse>(
        { error: "ID de recette requis ou paramètre 'all' manquant" },
        { status: 400 }
      );
    }

    // Vérifier que la recette appartient à l'utilisateur
    const recette = await prisma.recetteSemaine.findFirst({
      where: {
        id: recetteId,
        utilisateurId: utilisateur.id,
      },
    });

    if (!recette) {
      return NextResponse.json<ApiResponse>(
        { error: "Recette non trouvée" },
        { status: 404 }
      );
    }

    await prisma.recetteSemaine.delete({
      where: { id: recetteId },
    });

    return NextResponse.json<ApiResponse>({
      data: { success: true },
      message: "Recette supprimée",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Détails de l'erreur:", { errorMessage, errorStack });
    return NextResponse.json<ApiResponse>(
      { error: "Erreur serveur", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Ajoute automatiquement les ingrédients d'une recette Spoonacular à la liste d'épicerie
 * (sauf ceux déjà dans le garde-manger)
 * @returns Le nombre d'ingrédients ajoutés
 */
async function addSpoonacularIngredientsToListeEpicerie(
  utilisateurId: string,
  spoonacularId?: number | null,
  detailedCost?: any
): Promise<number> {
  console.log("🍴 [API] Ajout automatique des ingrédients Spoonacular à la liste d'épicerie");
  console.log("🍴 [API] Paramètres reçus:", {
    utilisateurId,
    spoonacularId,
    hasDetailedCost: !!detailedCost,
    detailedCostIngredientsCount: detailedCost?.ingredients?.length || 0,
  });
  
  // Si on a déjà le detailedCost avec les ingrédients, l'utiliser directement
  let ingredients: Array<{ name: string; amount: number; unit: string }> = [];
  
  if (detailedCost && detailedCost.ingredients && Array.isArray(detailedCost.ingredients)) {
    console.log("✅ [API] Utilisation des ingrédients depuis detailedCost");
    console.log(`📋 [API] Ingrédients reçus (raw):`, detailedCost.ingredients.map((ing: any) => `${ing.amount || ing.quantity || ''} ${ing.unit || ''} ${ing.name || ''} (original: ${ing.original || ''})`).join(', '));
    
    // Convertir les ingrédients du detailedCost en format SpoonacularIngredient
    const spoonacularIngredients: SpoonacularIngredient[] = detailedCost.ingredients.map((ing: any, index: number) => ({
      id: ing.id || index,
      name: ing.name || "",
      original: ing.original || ing.name || "",
      amount: ing.amount || ing.quantity || 1,
      unit: ing.unit || "",
    }));
    
    console.log(`📋 [API] Ingrédients convertis en format SpoonacularIngredient:`, spoonacularIngredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name} (original: ${ing.original})`).join(', '));
    
    // Convertir en items de liste d'épicerie en français
    const groceryItems = spoonacularIngredients.map(toGroceryItem);
    
    console.log(`📋 [API] Ingrédients traduits en français:`, groceryItems.map(item => `${item.quantity} ${item.unitFr} ${item.nameFr} (original EN: ${item.originalEn})`).join(', '));
    
    // Mapper vers le format attendu
    ingredients = groceryItems.map(item => ({
      name: item.nameFr,
      amount: item.quantity,
      unit: item.unitFr,
    }));
    console.log(`✅ [API] ${ingredients.length} ingrédient(s) traduit(s) et extrait(s) depuis detailedCost`);
  } else if (spoonacularId) {
    console.log(`✅ [API] Récupération des ingrédients depuis Spoonacular API pour la recette ${spoonacularId}`);
    try {
      // Récupérer les ingrédients depuis Spoonacular
      const recipeInfo = await getRecipeInformation(spoonacularId);
      console.log(`✅ [API] Informations récupérées: ${recipeInfo.extendedIngredients?.length || 0} ingrédient(s)`);
      // Utiliser le nouveau module de traduction pour convertir les ingrédients Spoonacular
      const spoonacularIngredients: SpoonacularIngredient[] = recipeInfo.extendedIngredients.map(ing => ({
        id: ing.id || 0,
        name: ing.name || "",
        original: ing.original || ing.originalString || "",
        amount: ing.amount || 1,
        unit: ing.unit || ing.unitShort || "",
      }));
      
      // Convertir en items de liste d'épicerie en français
      const groceryItems = spoonacularIngredients.map(toGroceryItem);
      
      // Mapper vers le format attendu
      ingredients = groceryItems.map(item => ({
        name: item.nameFr,
        amount: item.quantity,
        unit: item.unitFr,
      }));
      console.log(`✅ [API] ${ingredients.length} ingrédient(s) traduit(s) et mappé(s)`);
    } catch (error) {
      console.error("❌ [API] Erreur lors de la récupération des ingrédients depuis Spoonacular:", error);
      return 0;
    }
  } else {
    console.log("⚠️ [API] Aucun spoonacularId ni detailedCost fourni, impossible d'ajouter les ingrédients");
    return 0;
  }

  if (ingredients.length === 0) {
    console.log("⚠️ [API] Aucun ingrédient trouvé");
    return 0;
  }

  console.log(`🍴 [API] ${ingredients.length} ingrédient(s) à traiter`);

  // Récupérer le garde-manger de l'utilisateur
  const gardeManger = await prisma.articleGardeManger.findMany({
    where: { utilisateurId },
  });

  // Normaliser les noms du garde-manger pour la comparaison
  const pantryItems = gardeManger.map(item => ({
    ...item,
    normalizedName: normalizeIngredientName(item.nom),
  }));

  // Récupérer ou créer la liste d'épicerie active
  let liste = await prisma.listeEpicerie.findFirst({
    where: { utilisateurId },
    orderBy: { createdAt: "desc" },
  });

  if (!liste) {
    liste = await prisma.listeEpicerie.create({
      data: { utilisateurId },
    });
  }

  // Filtrer les ingrédients (exclure ceux dans le garde-manger)
  // Note: Les ingrédients sont déjà traduits en français par toGroceryItem
  const ingredientsToAdd: Array<{ name: string; amount: number; unit: string }> = [];
  
  for (const ingredient of ingredients) {
    // Les ingrédients sont déjà en français (nameFr), normaliser pour le matching
    const normalizedIngredientName = normalizeIngredientName(ingredient.name);
    
    // Vérifier si l'ingrédient est dans le garde-manger
    let inPantry = false;
    for (const pantryItem of pantryItems) {
      if (matchIngredients(normalizedIngredientName, pantryItem.normalizedName)) {
        // Vérifier si on a assez dans le garde-manger
        // Pour simplifier, on assume qu'on a assez si la quantité > 0
        if (pantryItem.quantite > 0) {
          inPantry = true;
          console.log(`✅ [API] "${ingredient.name}" est dans le garde-manger, ignoré`);
          break;
        }
      }
    }
    
    if (!inPantry) {
      ingredientsToAdd.push({
        name: ingredient.name, // Déjà en français
        amount: ingredient.amount,
        unit: ingredient.unit, // Déjà traduit
      });
    }
  }

  if (ingredientsToAdd.length === 0) {
    console.log("✅ [API] Tous les ingrédients sont dans le garde-manger, rien à ajouter");
    return 0;
  }

  console.log(`🍴 [API] Ajout de ${ingredientsToAdd.length} ingrédient(s) à la liste d'épicerie`);

  // Ajouter les ingrédients à la liste d'épicerie
  let addedCount = 0;
  for (const ingredient of ingredientsToAdd) {
    try {
      await prisma.ligneListe.create({
        data: {
          listeId: liste.id,
          nom: ingredient.name,
          quantite: ingredient.amount,
          unite: ingredient.unit || null,
          prixEstime: null, // Le prix sera calculé plus tard si nécessaire
        },
      });
      console.log(`✅ [API] "${ingredient.name}" ajouté à la liste d'épicerie`);
      addedCount++;
    } catch (error) {
      console.warn(`⚠️ [API] Erreur lors de l'ajout de "${ingredient.name}":`, error);
      // Continuer avec les autres ingrédients même si un échoue
    }
  }

  console.log(`✅ [API] ${addedCount} ingrédient(s) ajouté(s) à la liste d'épicerie`);
  return addedCount;
}

