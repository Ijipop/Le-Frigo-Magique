"use client";

import { useState, useEffect } from "react";
import { Search, ChefHat, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import { getFoodNames } from "../../../../lib/utils/foodItems";

interface Recipe {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
}

interface RecipeFinderProps {
  autoSearch?: boolean; // Si true, recherche automatiquement au chargement
}

export default function RecipeFinder({ autoSearch = false }: RecipeFinderProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [budget, setBudget] = useState<number | null>(null);
  const [preferredItems, setPreferredItems] = useState<string[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(5); // Afficher 5 recettes par défaut

  // Charger les données utilisateur au montage
  useEffect(() => {
    loadUserData();
    if (autoSearch) {
      // Attendre un peu pour que les données soient chargées
      setTimeout(() => {
        handleSearch();
      }, 500);
    }
  }, [autoSearch]);

  const loadUserData = async () => {
    try {
      // Charger le budget
      const budgetResponse = await fetch("/api/user/budget");
      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        if (budgetData.data?.budgetHebdomadaire) {
          setBudget(budgetData.data.budgetHebdomadaire);
        }
      }

      // Charger les aliments préférés
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          setPreferredItems(prefsData.data.alimentsPreferes);
        }
      }

      // Charger le garde-manger
      const pantryResponse = await fetch("/api/garde-manger");
      if (pantryResponse.ok) {
        const pantryData = await pantryResponse.json();
        if (pantryData.data && Array.isArray(pantryData.data)) {
          const itemNames = pantryData.data.map((item: any) => item.nom);
          setPantryItems(itemNames);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données utilisateur:", error);
    }
  };

  const handleSearch = async () => {
    // Construire la liste des ingrédients
    // Convertir les IDs d'aliments préférés en noms
    const preferredItemNames = getFoodNames(preferredItems);
    const allIngredients = [...preferredItemNames, ...pantryItems];
    
    if (allIngredients.length === 0) {
      toast.error("Veuillez sélectionner des aliments préférés ou ajouter des articles au garde-manger");
      return;
    }

    try {
      setSearching(true);
      setLoading(true);

      // Joindre les noms d'ingrédients pour la recherche
      const ingredientNames = allIngredients.join(",");

      const response = await fetch(
        `/api/web-recipes?ingredients=${encodeURIComponent(ingredientNames)}&budget=${budget || ""}`
      );

      // Vérifier le Content-Type avant de parser
      const contentType = response.headers.get("content-type");
      let data: any = {};
      
      try {
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          // Si ce n'est pas du JSON, essayer de lire le texte
          const text = await response.text();
          console.error("Réponse non-JSON:", text);
          throw new Error("Réponse invalide du serveur");
        }
      } catch (parseError) {
        console.error("Erreur lors du parsing de la réponse:", parseError);
        toast.error("Erreur lors de la lecture de la réponse du serveur");
        setRecipes([]);
        return;
      }

      // Gérer les erreurs de l'API
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `Erreur HTTP ${response.status}`;
        console.error("Erreur API:", {
          status: response.status,
          statusText: response.statusText,
          error: data?.error,
          message: data?.message,
          fullData: data
        });
        
        // Messages d'erreur spécifiques
        if (data?.error === "google_error") {
          toast.error("Erreur avec le service de recherche Google. Veuillez réessayer plus tard.");
        } else if (data?.error === "internal_error") {
          toast.error("Une erreur interne est survenue. Veuillez réessayer.");
        } else if (response.status === 500) {
          toast.error("Erreur serveur. Veuillez réessayer plus tard.");
        } else if (response.status === 401 || response.status === 403) {
          toast.error("Vous n'êtes pas autorisé à effectuer cette action.");
        } else {
          toast.error(`Erreur: ${errorMessage}`);
        }
        
        setRecipes([]);
        return;
      }

      // Traiter les résultats
      const foundRecipes = data.items || [];
      setRecipes(foundRecipes);
      // Réinitialiser le compteur d'affichage
      setDisplayCount(5);
      
      if (foundRecipes.length === 0) {
        toast.warning("Aucune recette trouvée. Essayez avec d'autres ingrédients.");
      } else if (data.cached) {
        toast.success(`${foundRecipes.length} recette${foundRecipes.length > 1 ? "s" : ""} trouvée${foundRecipes.length > 1 ? "s" : ""} (cache)`);
      } else {
        toast.success(`${foundRecipes.length} recette${foundRecipes.length > 1 ? "s" : ""} trouvée${foundRecipes.length > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de recettes:", error);
      toast.error("Une erreur est survenue lors de la recherche");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3 mb-4"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
        >
          <ChefHat className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Trouver des recettes
        </h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-sm text-gray-600 dark:text-gray-400 mb-4"
      >
        Recherchez des recettes québécoises basées sur vos aliments préférés, votre garde-manger et votre budget.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-6"
      >
        <Button
          onClick={handleSearch}
          disabled={searching || loading}
          className="w-full"
          variant="primary"
        >
          {searching || loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Rechercher des recettes
            </>
          )}
        </Button>
      </motion.div>

      {/* Affichage des recettes */}
      <AnimatePresence>
        {loading && recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </motion.div>
        ) : recipes.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {recipes.length} recette{recipes.length > 1 ? "s" : ""} trouvée{recipes.length > 1 ? "s" : ""}
              </h3>
              {recipes.length > displayCount && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Affichage de {displayCount} sur {recipes.length}
                </span>
              )}
            </div>
            
            {/* Liste des recettes */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              <AnimatePresence>
                {recipes.slice(0, displayCount).map((recipe, index) => (
                  <motion.a
                    key={index}
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group cursor-pointer"
                  >
                    {/* Miniature */}
                    <div className="flex-shrink-0">
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                  <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                          <ChefHat className="w-8 h-8 text-orange-400 dark:text-orange-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors">
                        {recipe.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {recipe.snippet}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {recipe.source}
                        </span>
                        <ExternalLink className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>

            {/* Bouton "Voir plus" / "Voir moins" */}
            {recipes.length > 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center pt-2"
              >
                <Button
                  onClick={() => {
                    if (displayCount >= recipes.length) {
                      setDisplayCount(5);
                    } else {
                      setDisplayCount(Math.min(displayCount + 5, recipes.length));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {displayCount >= recipes.length ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Voir moins
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Voir plus ({recipes.length - displayCount} restante{recipes.length - displayCount > 1 ? "s" : ""})
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : !loading ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-600 dark:text-gray-400 py-8"
          >
            Cliquez sur "Rechercher des recettes" pour trouver des recettes basées sur vos préférences.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

