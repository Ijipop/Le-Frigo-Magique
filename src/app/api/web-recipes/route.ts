import { NextResponse } from "next/server";
import { getCachedResults, saveCache } from "../../../../lib/webSearchCache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const ingredients = searchParams.get("ingredients") || "";
  const budget = searchParams.get("budget") || "";

  const query = `ingredients:${ingredients}-budget:${budget}`;

  // 1️⃣ — Vérifier cache
  const cached = await getCachedResults(query);
  if (cached) {
    return NextResponse.json({ items: cached, cached: true });
  }

  // 2️⃣ — Construire recherche Google CSE
  const q = `recette ${ingredients.replace(/,/g, " ")}`;

  const url = new URL("https://customsearch.googleapis.com/customsearch/v1");
  url.searchParams.set("key", process.env.GOOGLE_API_KEY!);
  url.searchParams.set("cx", process.env.GOOGLE_CX!);
  url.searchParams.set("q", q);

  const res = await fetch(url.toString());
  const data = await res.json();

  const items =
    data.items?.map((item: any) => ({
      title: item.title,
      url: item.link,
      image:
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        null,
      snippet: item.snippet,
      source: item.displayLink,
    })) ?? [];

  // 3️⃣ — Sauvegarder au cache (important!)
  await saveCache(query, items);

  return NextResponse.json({ items, cached: false });
}

