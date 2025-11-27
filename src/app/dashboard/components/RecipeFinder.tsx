"use client";

import { useState, useEffect } from "react";
import { ChefHat, ExternalLink, Loader2, ChevronDown, ChevronUp, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";

interface Recipe {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
}

interface RecipeFinderProps {
  recipes: Recipe[];
  loading: boolean;
}

export default function RecipeFinder({ recipes, loading }: RecipeFinderProps) {
  const [displayCount, setDisplayCount] = useState(5); // Afficher 5 recettes par défaut
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set()); // URLs des recettes sélectionnées
  const [addingToWeek, setAddingToWeek] = useState<Set<string>>(new Set()); // URLs en cours d'ajout

  // Charger les recettes déjà ajoutées au montage
  useEffect(() => {
    loadExistingRecettes();
  }, []);

  // Charger les recettes déjà ajoutées pour marquer celles qui sont déjà sélectionnées
  const loadExistingRecettes = async () => {
    try {
      const response = await fetch("/api/recettes-semaine");
      if (response.ok) {
        const result = await response.json();
        const recettesData = result.data || [];
        if (Array.isArray(recettesData) && recettesData.length > 0) {
          const urls = recettesData.map((r: { url: string }) => r.url);
          setSelectedRecipes(new Set(urls));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des recettes existantes:", error);
    }
  };


  const handleAddToWeek = async (recipe: Recipe) => {
    if (addingToWeek.has(recipe.url)) {
      return; // Déjà en cours d'ajout
    }

    try {
      setAddingToWeek(new Set([...addingToWeek, recipe.url]));

      const response = await fetch("/api/recettes-semaine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: recipe.title,
          url: recipe.url,
          image: recipe.image,
          snippet: recipe.snippet,
          source: recipe.source,
        }),
      });

      if (response.ok) {
        toast.success(`"${recipe.title}" ajoutée aux recettes de la semaine !`);
        setSelectedRecipes(new Set([...selectedRecipes, recipe.url]));
        // Déclencher un événement pour rafraîchir le composant RecettesSemaine
        window.dispatchEvent(new CustomEvent("recettes-semaine-updated"));
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast.info("Cette recette est déjà dans vos recettes de la semaine");
        } else {
          toast.error(error.error || "Erreur lors de l'ajout");
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setAddingToWeek(new Set([...addingToWeek].filter(url => url !== recipe.url)));
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
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
          >
            <ChefHat className="w-5 h-5 text-white" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trouver des recettes
          </h2>
        </div>
        {recipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
          >
            <Plus className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              Cliquez sur <span className="font-bold">+</span> pour ajouter aux recettes de la semaine
            </span>
          </motion.div>
        )}
      </motion.div>

      {recipes.length === 0 && !loading && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center py-8"
        >
          Utilisez la boîte de recherche ci-dessus pour trouver des recettes.
        </motion.p>
      )}

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
                {recipes.slice(0, displayCount).map((recipe, index) => {
                  const isAdding = addingToWeek.has(recipe.url);
                  const isAdded = selectedRecipes.has(recipe.url);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group"
                    >
                      {/* Miniature */}
                      <div className="flex-shrink-0">
                        {recipe.image ? (
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                            onClick={() => window.open(recipe.url, '_blank')}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 cursor-pointer">
                                    <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                  </div>
                                `;
                              }
                            }}
                          />
                        ) : (
                          <div 
                            className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 cursor-pointer"
                            onClick={() => window.open(recipe.url, '_blank')}
                          >
                            <ChefHat className="w-8 h-8 text-orange-400 dark:text-orange-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors cursor-pointer"
                          onClick={() => window.open(recipe.url, '_blank')}
                        >
                          {recipe.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {recipe.snippet}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {recipe.source}
                          </span>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToWeek(recipe);
                              }}
                              disabled={isAdding || isAdded}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isAdded
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50"
                              }`}
                              title={isAdded ? "Déjà ajoutée" : "Ajouter à la semaine"}
                            >
                              {isAdding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isAdded ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </motion.button>
                            <a
                              href={recipe.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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

