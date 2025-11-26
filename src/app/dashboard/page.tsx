import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <h1 className="text-3xl font-bold mb-4">Tableau de bord</h1>
      <p>Tu es bien connecté. Ici, on mettra ton garde-manger, ton budget, etc.</p>
    </main>
  );
}
