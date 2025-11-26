// app/api/web-recipes/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCachedResults, saveCache } from "../../../../lib/webSearchCache";
import { prisma } from "../../../../lib/prisma";
import { getOrCreateUser } from "../../../../lib/utils/user";
import { getFoodNames } from "../../../../lib/utils/foodItems";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    let ingredients = searchParams.get("ingredients") || "";
    let budget = searchParams.get("budget") || "";

    console.log("🔸 [API] params init:", { ingredients, budget });

    // Si les paramètres ne sont pas fournis, essayer de récupérer les préférences utilisateur
    if (!ingredients || !budget) {
      try {
        const { userId } = await auth();
        if (userId) {
          const utilisateur = await getOrCreateUser(userId);

          if (utilisateur) {
            // Récupérer le budget si non fourni
            if (!budget && utilisateur.budgetHebdomadaire) {
              budget = utilisateur.budgetHebdomadaire.toString();
            }

            // Récupérer les aliments préférés si non fournis
            if (!ingredients) {
              const preferences = await prisma.preferences.findUnique({
                where: { utilisateurId: utilisateur.id },
              });

              if (preferences?.alimentsPreferes) {
                try {
                  const alimentsIds = JSON.parse(
                    preferences.alimentsPreferes
                  );
                  if (Array.isArray(alimentsIds) && alimentsIds.length > 0) {
                    const alimentsNoms = getFoodNames(alimentsIds);
                    ingredients = alimentsNoms.join(",");
                  }
                } catch (e) {
                  console.error(
                    "❌ Erreur parsing alimentsPreferes:",
                    e
                  );
                }
              }

              // Ajouter aussi les articles du garde-manger
              const gardeManger = await prisma.articleGardeManger.findMany({
                where: { utilisateurId: utilisateur.id },
              });

              if (gardeManger.length > 0) {
                const gardeMangerNoms = gardeManger.map((item) => item.nom);
                if (ingredients) {
                  ingredients = `${ingredients},${gardeMangerNoms.join(",")}`;
                } else {
                  ingredients = gardeMangerNoms.join(",");
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la récupération des préférences:",
          error
        );
        // On continue avec ce qu'on a, même si c'est vide
      }
    }

    // Normalisation des ingrédients pour éviter les espaces chelous
    const ingredientsArray = ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    ingredients = ingredientsArray.join(",");

    console.log("🔸 [API] après prefs:", { ingredients, budget });

    // Clé de cache (doit rester stable pour une même recherche)
    const cacheKey = `ingredients:${ingredients}-budget:${budget}`;

    // 1️⃣ — Vérifier cache (et ignorer les résultats vides)
    const cached = await getCachedResults(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log("✅ [API] résultats récupérés du cache");
      return NextResponse.json({ items: cached, cached: true });
    }

    // 2️⃣ — Construire la requête pour Google CSE
    let q = "recette";
    if (ingredientsArray.length > 0) {
      q += " " + ingredientsArray.join(" ");
    }
    if (budget) {
      // influence, mais pas garanti : on reste honnête dans l'UI
      q += " économique pas cher";
    }

    console.log("🔎 [API] Google CSE query q =", q);

    const url = new URL(
      "https://customsearch.googleapis.com/customsearch/v1"
    );
    url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
    url.searchParams.set("cx", process.env.GOOGLE_CX!);
    url.searchParams.set("q", q);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok || (data as any).error) {
      console.error("❌ [API] Erreur Google CSE:", (data as any).error || data);
      return NextResponse.json(
        { items: [], error: (data as any).error || "google_error" },
        { status: 500 }
      );
    }

    const items =
      (data as any).items?.map((item: any) => ({
        title: item.title,
        url: item.link,
        image:
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src ||
          null,
        snippet: item.snippet,
        source: item.displayLink,
      })) ?? [];

    console.log(
      `🔸 [API] Google a retourné ${items.length} résultat(s)`
    );

    // 3️⃣ — Sauvegarder dans le cache seulement s'il y a des résultats
    if (items.length > 0) {
      await saveCache(cacheKey, items);
      console.log("💾 [API] résultats enregistrés dans le cache");
    } else {
      console.log("⚠️ [API] aucun résultat, cache non mis à jour");
    }

    return NextResponse.json({ items, cached: false });
  } catch (error) {
    console.error("❌ [API] erreur inattendue:", error);
    return NextResponse.json(
      { items: [], error: "internal_error" },
      { status: 500 }
    );
  }
}
