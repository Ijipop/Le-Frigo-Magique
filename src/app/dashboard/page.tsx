import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Tabs from "../../components/ui/tabs";
import GardeManger from "./components/GardeManger";
import QuickSettings from "./components/QuickSettings";
import FlyersSettings from "./components/FlyersSettings";
import ListeEpicerie from "./components/ListeEpicerie";
import CategoryItemSelector from "./components/CategoryItemSelector";
import RecipeSearchContainer from "./components/RecipeSearchContainer";
import RecettesSemaine from "./components/RecettesSemaine";
import { ChefHat, Settings } from "lucide-react";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/signin");
  }

  // Récupérer les informations de l'utilisateur
  const user = await currentUser();
  const userName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.firstName || user.lastName || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "utilisateur"
    : "utilisateur";

  const tabs = [
    {
      id: "frigo",
      label: "Frigo Magique",
      icon: <ChefHat className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecettesSemaine />
            <FlyersSettings />
          </div>

          <div>
            <RecipeSearchContainer />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GardeManger />
            <ListeEpicerie />
          </div>
        </div>
      ),
    },
    {
      id: "preferences",
      label: "Préférences",
      icon: <Settings className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <QuickSettings />
          <CategoryItemSelector />
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            Bienvenue {userName} dans votre frigo magique !
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Gérez votre planification de repas et votre budget.</p>
        </div>

        <Tabs tabs={tabs} defaultTab="frigo" />
      </div>
    </main>
  );
}
