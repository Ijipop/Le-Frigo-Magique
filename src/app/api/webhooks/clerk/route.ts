import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  try {
    if (eventType === "user.created") {
      const { id: clerkUserId, email_addresses, first_name, last_name } = evt.data;

      // Récupérer l'email principal
      const primaryEmail = email_addresses?.find((email: any) => email.id === evt.data.primary_email_address_id);
      const email = primaryEmail?.email_address || email_addresses?.[0]?.email_address;

      if (!email) {
        console.error("❌ Pas d'email trouvé pour l'utilisateur Clerk:", clerkUserId);
        return new NextResponse("Email missing", { status: 400 });
      }

      // Créer l'utilisateur dans Prisma
      const nom = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null;

      await prisma.utilisateur.create({
        data: {
          authUserId: clerkUserId,
          email: email,
          nom: nom,
        },
      });

      console.log("✅ Utilisateur créé dans Prisma:", email);
    }

    if (eventType === "user.updated") {
      const { id: clerkUserId, email_addresses, first_name, last_name } = evt.data;

      // Récupérer l'email principal
      const primaryEmail = email_addresses?.find((email: any) => email.id === evt.data.primary_email_address_id);
      const email = primaryEmail?.email_address || email_addresses?.[0]?.email_address;

      if (!email) {
        console.error("❌ Pas d'email trouvé pour l'utilisateur Clerk:", clerkUserId);
        return new NextResponse("Email missing", { status: 400 });
      }

      const nom = first_name && last_name ? `${first_name} ${last_name}` : first_name || last_name || null;

      // Mettre à jour l'utilisateur dans Prisma
      await prisma.utilisateur.update({
        where: { authUserId: clerkUserId },
        data: {
          email: email,
          nom: nom,
        },
      });

      console.log("✅ Utilisateur mis à jour dans Prisma:", email);
    }

    if (eventType === "user.deleted") {
      const { id: clerkUserId } = evt.data;

      // Supprimer l'utilisateur dans Prisma (cascade supprimera aussi ses relations)
      await prisma.utilisateur.delete({
        where: { authUserId: clerkUserId },
      });

      console.log("✅ Utilisateur supprimé de Prisma:", clerkUserId);
    }
  } catch (error: any) {
    console.error("❌ Erreur lors de la synchronisation avec Prisma:", error);

    // Si l'utilisateur existe déjà (pour user.created), on peut ignorer l'erreur
    if (error.code === "P2002" && eventType === "user.created") {
      console.log("⚠️ Utilisateur existe déjà, synchronisation ignorée");
      return new NextResponse("User already exists", { status: 200 });
    }

    // Si l'utilisateur n'existe pas (pour user.updated ou user.deleted)
    if (error.code === "P2025") {
      console.log("⚠️ Utilisateur non trouvé dans Prisma, synchronisation ignorée");
      return new NextResponse("User not found", { status: 200 });
    }

    return new NextResponse("Database error", { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
