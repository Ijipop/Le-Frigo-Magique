import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const ingredientsParam = searchParams.get("ingredients") || "";
    const budgetParam = searchParams.get("budget") || "";

    const ingredientsArray = ingredientsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let q = "recette";
    if (ingredientsArray.length > 0) {
      q += " " + ingredientsArray.join(" ");
    }
    if (budgetParam) {
      q += " économique pas cher";
    }

    console.log("🔎 [API SIMPLE] q =", q);

    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CX) {
      console.error("❌ GOOGLE_API_KEY ou GOOGLE_CX manquants");
      return NextResponse.json(
        { items: [], error: "missing_env" },
        { status: 500 }
      );
    }

    const url = new URL(
      "https://customsearch.googleapis.com/customsearch/v1"
    );
    url.searchParams.set("key", process.env.GOOGLE_API_KEY);
    url.searchParams.set("cx", process.env.GOOGLE_CX);
    url.searchParams.set("q", q);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!res.ok || (data as any).error) {
      console.error("❌ [API SIMPLE] Erreur Google:", (data as any).error || data);
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

    console.log(`🔸 [API SIMPLE] ${items.length} résultat(s)`);

    return NextResponse.json({ items, cached: false });
  } catch (error) {
    console.error("❌ [API SIMPLE] erreur inattendue:", error);
    return NextResponse.json(
      { items: [], error: "internal_error" },
      { status: 500 }
    );
  }
}
