import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "../../../../../lib/prisma";
import { getOrCreateUser } from "../../../../../lib/utils/user";
import { findMatchesInFlyerItems, matchIngredients } from "../../../../../lib/utils/ingredientMatcher";
import { getFlyerItems } from "../../../../../lib/utils/flippApi";
import { logger } from "../../../../../lib/utils/logger";
import { withRateLimit, RateLimitConfigs, checkRateLimit } from "../../../../../lib/utils/rateLimit";
import type { Preferences } from "@prisma/client";

const FLIPP_BASE_URL = "https://backflipp.wishabi.com/flipp";

const GROCERY_KEYWORDS = [
  "metro", "maxi", "iga", "super c", "walmart", "provigo", "loblaws",
  "sobeys", "food basics", "costco", "adonis", "uniprix", "pharmaprix",
  "jean coutu", "familiprix", "grocery", "iga extra", "metro plus", "supermarche",
  "épicerie", "supermarché","richelieu",
  "marché tradition", "marche tradition", "market tradition",
];

function isGroceryFlyer(flyer: any) {
  // Le champ merchant est directement une string dans l'API Flipp
  const merchant = (flyer?.merchant || "").toLowerCase();
  const name = (
    flyer?.merchant_name || 
    flyer?.name || 
    flyer?.merchant?.name ||
    flyer?.store_name ||
    flyer?.retailer_name ||
    ""
  ).toLowerCase();
  
  // Exclure les épiceries trop niche
  const excludedMerchants = ["lian tai", "liantai", "marché lian tai"];
  if (excludedMerchants.some(excluded => merchant.includes(excluded) || name.includes(excluded))) {
    return false;
  }
  
  const category = (
    flyer?.category ||
    flyer?.merchant?.category ||
    flyer?.type ||
    flyer?.categories_csv || // Flipp utilise categories_csv
    ""
  ).toLowerCase();
  
  // Vérifier le champ merchant directement (priorité)
  // Pour "Marché Tradition", vérifier si "marche" ET "tradition" sont présents
  const merchantMatch = GROCERY_KEYWORDS.some((kw) => {
    if (kw.includes("tradition")) {
      // Pour "marché tradition", vérifier que les deux mots sont présents
      return merchant.includes("marche") && merchant.includes("tradition");
    }
    return merchant.includes(kw);
  });
  
  const nameMatch = GROCERY_KEYWORDS.some((kw) => {
    if (kw.includes("tradition")) {
      // Pour "marché tradition", vérifier que les deux mots sont présents
      return name.includes("marche") && name.includes("tradition");
    }
    return name.includes(kw);
  });
  
  // La catégorie seule n'est pas suffisante - il faut aussi un match de nom/merchant
  // Sauf si c'est explicitement une catégorie d'épicerie/pharmacie ET qu'on a un nom de marchand connu
  const categoryMatch = (category.includes("grocery") || 
                        category.includes("groceries") ||
                        category.includes("épicerie") || 
                        category.includes("supermarket") ||
                        category.includes("food") ||
                        category.includes("pharmacy")) && // Inclure les pharmacies
                        (merchantMatch || nameMatch || merchant.length > 0);
  
  return merchantMatch || nameMatch || categoryMatch;
}

// GET - Chercher les rabais pour les ingrédients de la liste d'épicerie
export const GET = withRateLimit(
  RateLimitConfigs.EXPENSIVE, // 5 requêtes par minute (route très coûteuse)
  async (req: Request) => {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const utilisateur = await getOrCreateUser(userId);

    if (!utilisateur) {
      return NextResponse.json(
        { error: "Impossible de récupérer l'utilisateur" },
        { status: 500 }
      );
    }

    // Récupérer le code postal de l'utilisateur
    const preferences = (await prisma.preferences.findUnique({
      where: { utilisateurId: utilisateur.id },
    })) as (Preferences & { codePostal: string | null }) | null;

    if (!preferences?.codePostal) {
      return NextResponse.json(
        { error: "Code postal non configuré", message: "Veuillez configurer votre code postal dans les paramètres" },
        { status: 400 }
      );
    }

    // Récupérer la liste d'épicerie active
    const liste = await prisma.listeEpicerie.findFirst({
      where: { utilisateurId: utilisateur.id },
      include: {
        lignes: {
          orderBy: { nom: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!liste || liste.lignes.length === 0) {
      return NextResponse.json(
        { error: "Liste d'épicerie vide", message: "Votre liste d'épicerie est vide" },
        { status: 400 }
      );
    }

    // Récupérer les ingrédients de la liste
    const ingredients = liste.lignes.map((ligne) => ligne.nom);
    
    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "Liste d'épicerie vide", message: "Votre liste d'épicerie est vide" },
        { status: 400 }
      );
    }

    // Récupérer les flyers pour le code postal
    const flyersUrl = new URL(`${FLIPP_BASE_URL}/flyers`);
    flyersUrl.searchParams.set("postal_code", preferences.codePostal);

    const flyersRes = await fetch(flyersUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!flyersRes.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des flyers" },
        { status: 500 }
      );
    }

    const flyersData = await flyersRes.json();
    
    const allFlyers: any[] = Array.isArray(flyersData)
      ? flyersData
      : Array.isArray(flyersData.flyers)
        ? flyersData.flyers
        : [];

    // Filtrer seulement les épiceries
    const groceryFlyers = allFlyers.filter(isGroceryFlyer);

    // Pour chaque flyer, récupérer les items et chercher les matches
    const results: Array<{
      flyer: {
        id: number;
        merchant: string;
        title: string;
        thumbnail_url: string | null;
      };
      matches: Array<{
        ingredient: string;
        matchedItem: any;
        matchScore: number;
        savings: number | null;
      }>;
      totalSavings: number;
    }> = [];

    // Pour chaque merchant, prendre seulement le premier flyer (éviter les doublons)
    const uniqueFlyers: any[] = [];
    const seenMerchants = new Set<string>();
    
    for (const flyer of groceryFlyers) {
      const merchantKey = (flyer.merchant || flyer.name || "").toLowerCase().trim();
      if (!seenMerchants.has(merchantKey)) {
        seenMerchants.add(merchantKey);
        uniqueFlyers.push(flyer);
      }
    }
    
    // Prioriser Maxi, Metro, IGA, puis limiter à 8 flyers pour performance
    const priorityMerchants = ["maxi", "metro", "iga", "walmart", "provigo"];
    const prioritizedFlyers = uniqueFlyers.sort((a, b) => {
      const aMerchant = (a.merchant || a.name || "").toLowerCase();
      const bMerchant = (b.merchant || b.name || "").toLowerCase();
      const aPriority = priorityMerchants.findIndex(m => aMerchant.includes(m));
      const bPriority = priorityMerchants.findIndex(m => bMerchant.includes(m));
      if (aPriority === -1 && bPriority === -1) return 0;
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    });
    
    const flyersToProcess = prioritizedFlyers.slice(0, 8);
    
    // Stocker tous les items avec prix réguliers pour référence (toutes épiceries)
    const allItemsWithPrices: Array<{
      name: string;
      normalizedName: string;
      brand: string | null;
      print_id: string | null;
      original_price: number;
      current_price: number;
      merchant: string;
    }> = [];
    
    // Fonction pour normaliser un nom de produit
    const normalizeProductName = (name: string): string => {
      return (name || "").toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };
    
    // Fonction pour récupérer les items d'un flyer
    const fetchFlyerItems = async (flyer: any) => {
      const timeoutPromise = new Promise<{ items: any[]; error: string }>((resolve) =>
        setTimeout(() => resolve({ items: [], error: "Timeout" }), 10000)
      );
      
      const { items: flyerItems, error } = await Promise.race([
        getFlyerItems(flyer.id, flyer.flyer_run_id, flyer.path),
        timeoutPromise,
      ]);
      
      return { items: flyerItems, error, flyer };
    };
    
    // PREMIÈRE PASSE : Récupérer tous les items de tous les flyers
    const batchSize = 3;
    const allFlyerData: Array<{ items: any[]; flyer: any; merchantName: string }> = [];
    
    for (let i = 0; i < flyersToProcess.length; i += batchSize) {
      const batch = flyersToProcess.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchFlyerItems));
      
      batchResults.forEach(({ items, error, flyer }) => {
        const merchantName = flyer.merchant || flyer.merchant_name || flyer.name;
        
        if (error) {
          logger.warn(`Erreur pour ${merchantName}`, { merchant: merchantName, error });
        } else if (items.length === 0) {
          logger.debug(`Aucun item récupéré pour ${merchantName}`, { merchant: merchantName });
        } else {
          logger.info(`${items.length} items récupérés pour ${merchantName}`, { 
            merchant: merchantName, 
            itemsCount: items.length 
          });
          allFlyerData.push({ items, flyer, merchantName });
          
          // Stocker TOUS les items avec prix réguliers pour référence
          items.forEach((item: any) => {
            if (item.original_price && item.current_price) {
              const original = typeof item.original_price === 'number' 
                ? item.original_price 
                : parseFloat(item.original_price.toString());
              const current = typeof item.current_price === 'number'
                ? item.current_price
                : parseFloat(item.current_price.toString());
              
              if (!isNaN(original) && !isNaN(current) && original > 0 && current > 0) {
                allItemsWithPrices.push({
                  name: item.name,
                  normalizedName: normalizeProductName(item.name),
                  brand: item.brand || null,
                  print_id: item.print_id || null,
                  original_price: original,
                  current_price: current,
                  merchant: merchantName,
                });
              }
            }
          });
        }
      });
    }
    
    // Log pour déboguer
    logger.debug(`Items avec prix réguliers collectés: ${allItemsWithPrices.length}`, {
      totalItemsWithPrices: allItemsWithPrices.length,
      sampleItems: allItemsWithPrices.slice(0, 3).map(i => ({
        name: i.name,
        normalized: i.normalizedName,
        original: i.original_price,
        merchant: i.merchant
      }))
    });
    
    // DEUXIÈME PASSE : Traiter les matches avec estimation des prix
    const processFlyerMatches = (flyerData: { items: any[]; flyer: any; merchantName: string }) => {
      const { items: flyerItems, flyer, merchantName } = flyerData;
      
      logger.debug(`Recherche dans ${merchantName}`, {
        merchant: merchantName,
        itemsAvailable: flyerItems.length,
        sampleItems: flyerItems.slice(0, 5).map(i => i.name)
      });
      
      const matches = findMatchesInFlyerItems(ingredients, flyerItems);
      
      logger.debug(`Matches trouvés dans ${merchantName}`, {
        merchant: merchantName,
        matchesFound: matches.length,
        totalIngredients: ingredients.length,
        sampleMatches: matches.slice(0, 3).map(m => ({
          ingredient: m.ingredient,
          item: m.matchedItem.name,
          score: m.matchScore
        }))
      });
      
      if (matches.length === 0 && ingredients.length > 0) {
        logger.debug(`Aucun match trouvé dans ${merchantName}`, {
          merchant: merchantName,
          ingredients: ingredients.slice(0, 5)
        });
      }
      
      if (matches.length === 0) {
        return null;
      }
      
      const matchesWithSavings = matches.map((match) => {
        const item = match.matchedItem;
        let savings: number | null = null;
        let estimatedOriginalPrice: number | null = null;
        let isEstimated = false;

        if (item.original_price && item.current_price) {
          // Prix régulier fourni directement par l'épicerie
          const original = typeof item.original_price === 'number' 
            ? item.original_price 
            : parseFloat(item.original_price.toString());
          const current = typeof item.current_price === 'number'
            ? item.current_price
            : parseFloat(item.current_price.toString());
          
          if (!isNaN(original) && !isNaN(current) && original > current) {
            savings = original - current;
          }
        } else if (item.current_price) {
          // Pas de prix régulier fourni - chercher un produit IDENTIQUE dans d'autres épiceries
          const current = typeof item.current_price === 'number'
            ? item.current_price
            : parseFloat(item.current_price.toString());
          
          if (!isNaN(current) && current > 0) {
            const normalizedItemName = normalizeProductName(item.name);
            const itemBrand = (item.brand || "").toLowerCase().trim();
            const itemPrintId = item.print_id || null;
            
            // Chercher un produit IDENTIQUE dans d'autres épiceries
            // Priorité 1: Même print_id (code-barres) = produit exactement identique
            // Priorité 2: Nom normalisé identique + même marque
            // Priorité 3: Nom normalisé identique (sans marque)
            let identicalItem = null;
            
            if (itemPrintId) {
              // Chercher par print_id d'abord (produit exactement identique)
              identicalItem = allItemsWithPrices.find(refItem => 
                refItem.print_id && refItem.print_id === itemPrintId
              );
            }
            
            if (!identicalItem) {
              // Chercher par nom normalisé identique + marque
              if (itemBrand) {
                identicalItem = allItemsWithPrices.find(refItem => {
                  const refBrand = (refItem.brand || "").toLowerCase().trim();
                  return refItem.normalizedName === normalizedItemName && 
                         refBrand === itemBrand;
                });
              }
            }
            
            if (!identicalItem) {
              // Chercher par nom normalisé exactement identique (sans marque)
              identicalItem = allItemsWithPrices.find(refItem => 
                refItem.normalizedName === normalizedItemName
              );
            }
            
            if (identicalItem && identicalItem.original_price) {
              estimatedOriginalPrice = identicalItem.original_price;
              isEstimated = true;
              if (estimatedOriginalPrice > current) {
                savings = estimatedOriginalPrice - current;
              }
              logger.info(`Prix estimé trouvé pour "${item.name}"`, {
                itemName: item.name,
                normalized: normalizedItemName,
                foundIn: identicalItem.merchant,
                refName: identicalItem.name,
                matchType: itemPrintId && identicalItem.print_id === itemPrintId ? "print_id" : 
                          itemBrand && (identicalItem.brand || "").toLowerCase().trim() === itemBrand ? "name+brand" : "name",
                estimatedPrice: estimatedOriginalPrice,
                currentPrice: current,
                savings
              });
            } else {
              // Log pour déboguer pourquoi aucun match n'est trouvé
              if (matches.indexOf(match) < 2) {
                logger.debug(`Aucun prix de référence trouvé pour "${item.name}"`, {
                  itemName: item.name,
                  normalized: normalizedItemName,
                  brand: itemBrand || "none",
                  printId: itemPrintId || "none",
                  hasCurrentPrice: !!item.current_price,
                  currentPrice: current,
                  totalRefItems: allItemsWithPrices.length
                });
              }
            }
          }
        }

        return {
          ...match,
          savings,
          estimatedOriginalPrice: estimatedOriginalPrice || undefined,
          isEstimated,
        };
      });

      const totalSavings = matchesWithSavings.reduce(
        (sum, match) => sum + (match.savings || 0),
        0
      );

      return {
        flyer: {
          id: flyer.id,
          merchant: merchantName,
          title: flyer.name,
          thumbnail_url:
            flyer.grid_thumbnail_url ||
            flyer.thumbnail_url ||
            flyer.flyer_image ||
            null,
        },
        matches: matchesWithSavings,
        totalSavings,
      };
    };
    
    // Traiter tous les flyers avec les matches
    allFlyerData.forEach((flyerData) => {
      const result = processFlyerMatches(flyerData);
      if (result) {
        results.push(result);
      }
    });

    // Prioriser les grandes épiceries, puis trier par économies totales
    const majorGrocers = [
      "maxi", "provigo", "iga", "metro", "super c", "walmart", 
      "costco", "loblaws", "metro plus", "iga extra", "marché tradition",
      "marche tradition", "familiprix", "jean coutu", "pharmaprix"
    ];
    
    const getGrocerPriority = (merchantName: string): number => {
      const normalized = merchantName.toLowerCase();
      const index = majorGrocers.findIndex(grocer => normalized.includes(grocer));
      return index === -1 ? 999 : index; // Plus petit = plus prioritaire
    };
    
    results.sort((a, b) => {
      const priorityA = getGrocerPriority(a.flyer.merchant || "");
      const priorityB = getGrocerPriority(b.flyer.merchant || "");
      
      // D'abord par priorité de l'épicerie
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Ensuite par économies totales décroissantes
      return b.totalSavings - a.totalSavings;
    });

    return NextResponse.json({
      postalCode: (preferences as Preferences & { codePostal: string | null }).codePostal,
      ingredientsCount: ingredients.length,
      flyersChecked: groceryFlyers.length,
      results,
      totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
    });
  },
  async () => {
    const { userId } = await auth();
    return userId || null;
  }
);

