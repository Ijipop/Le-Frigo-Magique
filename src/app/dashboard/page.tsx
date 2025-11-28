import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Tabs from "../../components/ui/tabs";
import GardeManger from "./components/GardeManger";
import QuickSettings from "./components/QuickSettings";
import ListeEpicerie from "./components/ListeEpicerie";
import ChercherRabais from "./components/ChercherRabais";
import CategoryItemSelector from "./components/CategoryItemSelector";
import RecipeSearchContainer from "./components/RecipeSearchContainer";
import RecettesSemaine from "./components/RecettesSemaine";
import InformationsLegales from "./components/InformationsLegales";
import Favoris from "./components/Favoris";
import { ChefHat, Settings, ShoppingBag, Scale, Heart, User, DollarSign } from "lucide-react";
import Preferences from "./components/Preferences";

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
          <RecettesSemaine />

          <div>
            <RecipeSearchContainer />
          </div>

          <GardeManger />
        </div>
      ),
    },
    {
      id: "circulaire",
      label: "Liste/Rabais",
      icon: <ShoppingBag className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <ChercherRabais />
          <ListeEpicerie />
        </div>
      ),
    },
    {
      id: "budget",
      label: "Budget",
      icon: <DollarSign className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <QuickSettings />
        </div>
      ),
    },
    {
      id: "favoris",
      label: "Favoris",
      icon: <Heart className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <Favoris />
        </div>
      ),
    },
    {
      id: "preferences",
      label: "Préférences",
      icon: <User className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <Preferences />
        </div>
      ),
    },
    {
      id: "legal",
      label: "À propos",
      icon: <Scale className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          <InformationsLegales />
        </div>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 max-md:px-4 max-sm:px-3 py-10 max-md:py-6 max-sm:py-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-md:mb-6 max-sm:mb-4">
          <h1 className="text-4xl max-md:text-2xl max-sm:text-xl font-bold mb-2 max-sm:mb-1 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
            Bienvenue {userName} dans votre frigo magique !
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-md:text-sm max-sm:text-xs">Gérez votre planification de repas et votre budget.</p>
        </div>

        <Tabs tabs={tabs} defaultTab="frigo" />
      </div>
    </main>
  );
}
