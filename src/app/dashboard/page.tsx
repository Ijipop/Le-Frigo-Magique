import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import GardeManger from "./components/GardeManger";
import BudgetSelector from "./components/BudgetSelector";
import CategoryItemSelector from "./components/CategoryItemSelector";
import AllergiesSelector from "./components/AllergiesSelector";
import RecipeFinder from "./components/RecipeFinder";
import RecettesSemaine from "./components/RecettesSemaine";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            Tableau de bord
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Bienvenue ! Gérez votre planification de repas et votre budget.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <BudgetSelector />
          <GardeManger />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <RecipeFinder />
          <RecettesSemaine />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <AllergiesSelector />
          <CategoryItemSelector />
        </div>
      </div>
    </main>
  );
}
