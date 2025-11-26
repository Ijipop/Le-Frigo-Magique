import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Optionnel mais conseillé : s'assurer qu'on est en runtime Node
export const runtime = "nodejs";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  const payload = await req.text();
  const headerPayload = await headers();

  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const eventType = evt.type as string;
  console.log("🔔 Clerk webhook reçu :", eventType);

  // Ici tu brancheras Prisma plus tard
  if (eventType === "user.created") {
    console.log("Nouvel utilisateur :", evt.data.id);
  }

  if (eventType === "user.updated") {
    console.log("Utilisateur mis à jour :", evt.data.id);
  }

  if (eventType === "user.deleted") {
    console.log("Utilisateur supprimé :", evt.data.id);
  }

  return new NextResponse("OK", { status: 200 });
}
