import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
          Tableau de bord
        </h1>
        <p className="text-gray-600 mb-8">Bienvenue ! Gérez votre planification de repas et votre budget.</p>
        
        {/* Placeholder pour les fonctionnalités futures */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Garde-manger</h2>
            <p className="text-gray-600">À venir : Gestion de votre garde-manger</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Budget</h2>
            <p className="text-gray-600">À venir : Suivi de votre budget hebdomadaire</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Planification</h2>
            <p className="text-gray-600">À venir : Planification de vos repas</p>
          </div>
        </div>
      </div>
    </main>
  );
}
