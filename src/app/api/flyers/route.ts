import { NextResponse } from "next/server";

const FLIPP_BASE_URL = "https://backflipp.wishabi.com/flipp";

const GROCERY_KEYWORDS = [
  "metro",
  "maxi",
  "iga",
  "super c",
  "walmart",
  "provigo",
  "loblaws",
  "sobeys",
  "food basics",
  "pharmaprix", // Parfois considéré comme épicerie
  "jean coutu", // Parfois a des produits alimentaires
  "uniprix",
  "familiprix", // Pharmacie
  "costco",
  "adonis",
  "iga extra",
  "metro plus",
  "supermarche",
  "épicerie",
  "grocery",
  "supermarché",
  "marché tradition", // Chaîne d'épiceries
  "marche tradition",
  "market tradition",
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
  
  // Vérifier le champ merchant directement
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
  
  const categoryMatch = category.includes("grocery") || 
                        category.includes("groceries") ||
                        category.includes("épicerie") || 
                        category.includes("supermarket") ||
                        category.includes("food") ||
                        category.includes("pharmacy"); // Inclure les pharmacies
  
  return merchantMatch || nameMatch || categoryMatch;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let postalCode = searchParams.get("postalCode") || "H1A1A1";
    
    // Normaliser le code postal : enlever les espaces et mettre en majuscules
    postalCode = postalCode.replace(/\s+/g, "").toUpperCase();
    
    const includeAll = searchParams.get("includeAll") === "true"; // Pour déboguer
    const includeDebug = searchParams.get("debug") === "true"; // Pour déboguer
    
    const url = new URL(`${FLIPP_BASE_URL}/flyers`);
    url.searchParams.set("postal_code", postalCode);

    const res = await fetch(url.toString(), {
      // On se comporte comme un navigateur
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      // Évite le cache côté Next pour les tests
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Flipp flyers error:", res.status, text);
      return NextResponse.json(
        { error: "flipp_error", status: res.status, details: text },
        { status: 500 },
      );
    }

    const data = await res.json();

    // Flipp retourne souvent un tableau `flyers` ou directement un tableau
    const allFlyers: any[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any).flyers)
        ? (data as any).flyers
        : Array.isArray((data as any).merchants)
          ? (data as any).merchants
          : [];

    // Filtrer seulement les épiceries (sauf si includeAll=true pour déboguer)
    const filteredFlyers = includeAll ? allFlyers : allFlyers.filter(isGroceryFlyer);

    const groceryFlyers = filteredFlyers.map((flyer) => ({
      id: flyer.id || flyer.flyer_id,
      merchant: flyer.merchant || flyer.merchant_name || flyer.name || flyer.merchant?.name,
      title: flyer.name || flyer.title || flyer.merchant_name || flyer.merchant,
      valid_from: flyer.valid_from || flyer.start_date,
      valid_to: flyer.valid_to || flyer.end_date,
      // parfois `grid_thumbnail_url` ou autre
      thumbnail_url:
        flyer.grid_thumbnail_url ||
        flyer.thumbnail_url ||
        flyer.flyer_image ||
        flyer.image_url ||
        flyer.merchant?.logo_url ||
        null,
      // info géo si dispo
      distance: flyer.distance,
      store_address: flyer.store_address || flyer.address,
    }));

    const response: any = {
      postalCode,
      count: groceryFlyers.length,
      flyers: groceryFlyers,
    };

    // Ajouter le debug seulement si demandé
    if (includeDebug) {
      const sampleFlyers = allFlyers.slice(0, 3).map((flyer) => ({
        raw: flyer,
        name: flyer?.merchant_name || flyer?.name || flyer?.merchant?.name || "N/A",
        isGrocery: isGroceryFlyer(flyer),
      }));

      response.debug = {
        totalReceived: allFlyers.length,
        sampleFlyers,
        rawStructure: {
          isArray: Array.isArray(data),
          keys: Object.keys(data),
        },
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ /api/flyers unexpected error:", error);
    return NextResponse.json(
      { error: "internal_error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

