"use client";

import { useState, useEffect } from "react";
import { ChefHat, ExternalLink, Loader2, ChevronDown, ChevronUp, Check, Plus, Heart } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";

interface DetailedCost {
  totalCost: number;
  savingsFromPantry: number;
  originalCost: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    price: number;
    source: string;
    inPantry: boolean;
  }>;
}

interface Recipe {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
  estimatedCost?: number;
  spoonacularId?: number;
  detailedCost?: DetailedCost;
  servings?: number;
}

interface RecipeFinderProps {
  recipes: Recipe[];
  loading: boolean;
}

export default function RecipeFinder({ recipes, loading }: RecipeFinderProps) {
  const [displayCount, setDisplayCount] = useState(5); // Afficher 5 recettes par défaut
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set()); // URLs des recettes sélectionnées
  const [addingToWeek, setAddingToWeek] = useState<Set<string>>(new Set()); // URLs en cours d'ajout
  const [favoriteRecipes, setFavoriteRecipes] = useState<Set<string>>(new Set()); // URLs des recettes favorites
  const [addingToFavorites, setAddingToFavorites] = useState<Set<string>>(new Set()); // URLs en cours d'ajout aux favoris
  const [calculatingCost, setCalculatingCost] = useState<Set<string>>(new Set()); // URLs en cours de calcul de coût
  const [recipesWithCost, setRecipesWithCost] = useState<Map<string, DetailedCost>>(new Map()); // Coûts détaillés calculés

  // Charger les recettes déjà ajoutées au montage
  useEffect(() => {
    loadExistingRecettes();
    loadExistingFavorites();
  }, []);

  // Fonction pour calculer le coût détaillé à la demande
  const calculateDetailedCost = async (recipe: Recipe) => {
    if (!recipe.spoonacularId || calculatingCost.has(recipe.url)) {
      return;
    }

    try {
      setCalculatingCost(prev => new Set(prev).add(recipe.url));
      
      const response = await fetch("/api/recipes/spoonacular-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.spoonacularId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setRecipesWithCost(prev => {
            const newMap = new Map(prev);
            newMap.set(recipe.url, data.data);
            return newMap;
          });
        }
      } else {
        toast.error("Erreur lors du calcul du coût détaillé");
      }
    } catch (error) {
      console.error("Erreur lors du calcul du coût:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setCalculatingCost(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipe.url);
        return newSet;
      });
    }
  };

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

  // Charger les recettes favorites
  const loadExistingFavorites = async () => {
    try {
      const response = await fetch("/api/recettes-favorites");
      if (response.ok) {
        const result = await response.json();
        const favoritesData = result.data || [];
        if (Array.isArray(favoritesData) && favoritesData.length > 0) {
          const urls = favoritesData.map((r: { url: string }) => r.url);
          setFavoriteRecipes(new Set(urls));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
    }
  };


  const handleAddToWeek = async (recipe: Recipe) => {
    if (addingToWeek.has(recipe.url)) {
      return; // Déjà en cours d'ajout
    }

    try {
      setAddingToWeek(new Set([...addingToWeek, recipe.url]));

      // Préparer les données à envoyer
      const detailedCostData = recipe.detailedCost || recipesWithCost.get(recipe.url) || null;
      
      const payload: any = {
        titre: recipe.title,
        url: recipe.url,
        image: recipe.image,
        snippet: recipe.snippet,
        source: recipe.source,
        estimatedCost: recipe.estimatedCost,
        servings: recipe.servings,
      };
      
      // Ajouter spoonacularId et detailedCost si disponibles (pour ajout automatique des ingrédients)
      if (recipe.spoonacularId) {
        payload.spoonacularId = recipe.spoonacularId;
        console.log("📤 [Frontend] spoonacularId trouvé:", recipe.spoonacularId);
      } else {
        console.log("⚠️ [Frontend] Pas de spoonacularId pour cette recette");
      }
      
      if (detailedCostData) {
        payload.detailedCost = detailedCostData;
        console.log("📤 [Frontend] detailedCost trouvé avec", detailedCostData.ingredients?.length || 0, "ingrédients");
      } else {
        console.log("⚠️ [Frontend] Pas de detailedCost pour cette recette");
      }
      
      console.log("📤 [Frontend] Envoi de la recette:", {
        titre: payload.titre,
        spoonacularId: payload.spoonacularId,
        hasDetailedCost: !!payload.detailedCost,
        source: payload.source,
      });

      const response = await fetch("/api/recettes-semaine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ [Frontend] Réponse de l'API:", result);
        const hasIngredients = result.data?.ingredientsAdded || false;
        
        if (hasIngredients) {
          toast.success(`"${recipe.title}" ajoutée aux recettes de la semaine ! Les ingrédients ont été ajoutés à votre liste d'épicerie.`);
        } else {
          toast.success(`"${recipe.title}" ajoutée aux recettes de la semaine !`);
        }
        
        setSelectedRecipes(new Set([...selectedRecipes, recipe.url]));
        // Déclencher des événements pour rafraîchir les composants
        window.dispatchEvent(new CustomEvent("recettes-semaine-updated"));
        if (hasIngredients) {
          window.dispatchEvent(new CustomEvent("liste-epicerie-updated"));
        }
      } else {
        const errorText = await response.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || "Erreur inconnue" };
        }
        
        console.error("❌ [Frontend] Erreur lors de l'ajout:", {
          status: response.status,
          error: error,
        });
        
        if (response.status === 409) {
          toast.info("Cette recette est déjà dans vos recettes de la semaine");
        } else {
          toast.error(error.error || `Erreur lors de l'ajout (${response.status})`);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setAddingToWeek(new Set([...addingToWeek].filter(url => url !== recipe.url)));
    }
  };

  const handleToggleFavorite = async (recipe: Recipe) => {
    if (addingToFavorites.has(recipe.url)) {
      return; // Déjà en cours
    }

    const isFavorite = favoriteRecipes.has(recipe.url);

    try {
      setAddingToFavorites(new Set([...addingToFavorites, recipe.url]));

      if (isFavorite) {
        // Retirer des favoris
        const response = await fetch(`/api/recettes-favorites?url=${encodeURIComponent(recipe.url)}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success(`"${recipe.title}" retirée des favoris`);
          setFavoriteRecipes(new Set([...favoriteRecipes].filter(url => url !== recipe.url)));
          // Déclencher un événement pour rafraîchir le composant Favoris
          window.dispatchEvent(new CustomEvent("favoris-updated"));
        } else {
          toast.error("Erreur lors de la suppression des favoris");
        }
      } else {
        // Ajouter aux favoris
        const response = await fetch("/api/recettes-favorites", {
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
          toast.success(`"${recipe.title}" ajoutée aux favoris !`);
          setFavoriteRecipes(new Set([...favoriteRecipes, recipe.url]));
          // Déclencher un événement pour rafraîchir le composant Favoris
          window.dispatchEvent(new CustomEvent("favoris-updated"));
        } else {
          const error = await response.json();
          if (response.status === 409) {
            toast.info("Cette recette est déjà dans vos favoris");
            setFavoriteRecipes(new Set([...favoriteRecipes, recipe.url]));
          } else {
            toast.error(error.error || "Erreur lors de l'ajout aux favoris");
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la gestion des favoris:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setAddingToFavorites(new Set([...addingToFavorites].filter(url => url !== recipe.url)));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50 overflow-hidden"
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
            Recettes trouver
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
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto overflow-x-hidden pr-3 pl-1">
              <AnimatePresence>
                {recipes.slice(0, displayCount).map((recipe, index) => {
                  const isAdding = addingToWeek.has(recipe.url);
                  const isAdded = selectedRecipes.has(recipe.url);
                  const isFavorite = favoriteRecipes.has(recipe.url);
                  const isAddingToFavorites = addingToFavorites.has(recipe.url);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => window.open(recipe.url, '_blank')}
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
                            className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600"
                          >
                            <ChefHat className="w-8 h-8 text-orange-400 dark:text-orange-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 
                          className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors"
                        >
                          {recipe.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {recipe.snippet}
                        </p>
                        
                        {/* Coût détaillé (Spoonacular) */}
                        {recipe.source === "spoonacular.com" && (
                          <div className="mb-2">
                            {recipe.detailedCost || recipesWithCost.get(recipe.url) ? (
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-600 dark:text-green-400">
                                    Coût: ${((recipe.detailedCost || recipesWithCost.get(recipe.url))?.totalCost ?? 0).toFixed(2)}
                                  </span>
                                  {((recipe.detailedCost || recipesWithCost.get(recipe.url))?.savingsFromPantry ?? 0) > 0 && (
                                    <span className="text-green-500 dark:text-green-400">
                                      (Économie: ${((recipe.detailedCost || recipesWithCost.get(recipe.url))?.savingsFromPantry ?? 0).toFixed(2)})
                                    </span>
                                  )}
                                </div>
                                {((recipe.detailedCost || recipesWithCost.get(recipe.url))?.originalCost ?? 0) > 0 && (
                                  <span className="text-gray-500 dark:text-gray-400 line-through">
                                    Prix original: ${((recipe.detailedCost || recipesWithCost.get(recipe.url))?.originalCost ?? 0).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  calculateDetailedCost(recipe);
                                }}
                                disabled={calculatingCost.has(recipe.url)}
                                className="text-xs text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 flex items-center gap-1"
                              >
                                {calculatingCost.has(recipe.url) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Calcul...
                                  </>
                                ) : (
                                  "Calculer le coût détaillé"
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Coût estimé (si pas de coût détaillé) */}
                        {recipe.estimatedCost && recipe.estimatedCost > 0 && !recipe.detailedCost && !recipesWithCost.get(recipe.url) && (
                          <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                            Coût estimé: ${recipe.estimatedCost.toFixed(2)}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {recipe.source}
                          </span>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(recipe);
                              }}
                              disabled={isAddingToFavorites}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isFavorite
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              {isAddingToFavorites ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                              )}
                            </motion.button>
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

