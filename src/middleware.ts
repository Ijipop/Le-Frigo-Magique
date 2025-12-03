import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes publiques (accessibles sans authentification)
const isPublicRoute = createRouteMatcher([
  "/",
  "/signup",
  "/signin",
  "/signout",
  "/api/webhooks/clerk", // Webhook Clerk doit être accessible publiquement
  "/api/stripe/webhook", // Webhook Stripe doit être accessible publiquement
]);

export default clerkMiddleware(async (auth, req) => {
  // Protéger toutes les routes sauf les routes publiques
  // Les routes API sont déjà protégées dans leurs handlers avec auth()
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)"],
};

