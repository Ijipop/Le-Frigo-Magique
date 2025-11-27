import { NextResponse } from "next/server";

const FLIPP_BASE_URL = "https://backflipp.wishabi.com/flipp";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: flyerId } = await params;

    const url = new URL(`${FLIPP_BASE_URL}/flyer/${flyerId}`);
    url.searchParams.set("locale", "fr");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("❌ Flipp flyer items error:", res.status, text);
      return NextResponse.json(
        { error: "flipp_error", status: res.status, details: text },
        { status: 500 },
      );
    }

    const data = await res.json();

    // Le JSON de Flipp a souvent une propriété `items` ou `clippings`
    const rawItems: any[] =
      (data as any).items ||
      (data as any).clippings ||
      [];

    const deals = rawItems.map((item: any) => {
      // Normaliser le nom pour faciliter le matching
      const name = item.name || item.brand || "";
      
      return {
        id: item.id,
        name,
        normalizedName: name.toLowerCase().trim(),
        description: item.description || "",
        current_price: item.current_price || item.price || null,
        original_price: item.original_price || item.was_price || null,
        image_url: item.image_url || item.flyer_image || null,
        category: item.category || null,
      };
    });

    return NextResponse.json({
      flyerId,
      count: deals.length,
      deals,
    });
  } catch (error) {
    console.error("❌ /api/flyers/[id]/items error:", error);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 },
    );
  }
}

