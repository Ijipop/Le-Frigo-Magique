"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle, Heart, Settings, Calendar, UtensilsCrossed, Loader2, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";
import { getFoodNames } from "../../../../lib/utils/foodItems";

const COMMON_ALLERGIES = [
  { id: "gluten", nom: "Gluten" },
  { id: "lactose", nom: "Lactose" },
  { id: "arachides", nom: "Arachides" },
  { id: "noix", nom: "Noix" },
  { id: "soja", nom: "Soja" },
  { id: "poisson", nom: "Poisson" },
  { id: "crustaces", nom: "Crustacés" },
  { id: "oeufs", nom: "Œufs" },
  { id: "fruits-de-mer", nom: "Fruits de mer" },
  { id: "sulfites", nom: "Sulfites" },
  { id: "sesame", nom: "Sésame" },
  { id: "moutarde", nom: "Moutarde" },
];

export default function QuickSettings() {
  const [budget, setBudget] = useState(100);
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set());
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // États pour la génération de recettes
  const [nbJours, setNbJours] = useState(7);
  const [nbDejeuners, setNbDejeuners] = useState(0);
  const [nbDiners, setNbDiners] = useState(0);
  const [nbSoupers, setNbSoupers] = useState(0);
  const [respecterBudget, setRespecterBudget] = useState(true);
  
  // États dérivés pour compatibilité
  const dejeuner = nbDejeuners > 0;
  const diner = nbDiners > 0;
  const souper = nbSoupers > 0;
  
  // États pour la modal de sélection
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);
  const [selectedRecipeUrls, setSelectedRecipeUrls] = useState<Set<string>>(new Set());
  
  // État pour l'accordéon du récapitulatif
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  useEffect(() => {
    loadData();
    
    // Écouter les mises à jour des préférences
    const handlePreferencesUpdate = () => {
      loadData();
    };
    
    window.addEventListener("preferences-updated", handlePreferencesUpdate);
    return () => {
      window.removeEventListener("preferences-updated", handlePreferencesUpdate);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger le budget
      const budgetResponse = await fetch("/api/user/budget");
      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        if (budgetData.data?.budgetHebdomadaire) {
          setBudget(budgetData.data.budgetHebdomadaire);
        }
      }

      // Charger les allergies et aliments préférés
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          setSelectedAllergies(new Set(prefsData.data.allergies));
        }
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          setSelectedFavorites(new Set(prefsData.data.alimentsPreferes));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipes = async () => {
    // Vérifier qu'au moins un repas est sélectionné
    if (nbDejeuners === 0 && nbDiners === 0 && nbSoupers === 0) {
      toast.error("Veuillez sélectionner au moins un repas");
      return;
    }

    try {
      setGenerating(true);
      
      // 🎯 NOUVELLE LOGIQUE : Calculer le budget avec les quantités spécifiques par type
      const nombreTotalRepas = nbDejeuners + nbDiners + nbSoupers;
      const budgetPourNbJours = (budget / 7) * nbJours; // Budget pour nbJours (proportionnel)
      const budgetParRepas = respecterBudget && budget > 0 && nombreTotalRepas > 0 
        ? Math.round((budgetPourNbJours / nombreTotalRepas) * 100) / 100 // Arrondir à 2 décimales
        : null;
      
      console.log(`🍳 Génération de recettes:`);
      console.log(`   - ${nbDejeuners} déjeuner(s)`);
      console.log(`   - ${nbDiners} dîner(s)`);
      console.log(`   - ${nbSoupers} souper(s)`);
      console.log(`   - Total: ${nombreTotalRepas} repas`);
      console.log(`💰 Budget hebdomadaire: ${budget}$, Budget pour ${nbJours} jours: ${budgetPourNbJours.toFixed(2)}$, Budget par repas: ${budgetParRepas}$`);
      
      // Construire les filtres de base (sans les types de repas)
      const baseFilters: string[] = [];
      if (respecterBudget) baseFilters.push("economique");
      
      // Faire une recherche pour chaque type de repas avec la quantité spécifiée
      const allRecipes: any[] = [];
      const seenUrls = new Set<string>();
      
      // Fonction helper pour rechercher des recettes pour un type de repas
      const searchRecipesForType = async (
        typeRepas: string,
        quantite: number,
        typeRepasLabel: string
      ): Promise<void> => {
        if (quantite === 0) return;
        
        const maxResults = quantite + 1; // quantite + 1 pour avoir du choix
        const filtersForSearch = [typeRepas, ...baseFilters];
        
        const searchParams = new URLSearchParams({
          ingredients: "",
          ...(budgetParRepas && budgetParRepas > 0 ? { budget: budgetParRepas.toString() } : {}),
          allergies: Array.from(selectedAllergies).join(","),
          filters: filtersForSearch.join(","),
          nbJours: quantite.toString(), // Utiliser la quantité comme nbJours
        });
        
        console.log(`🔍 Recherche pour ${quantite} ${typeRepasLabel}...`);
        const response = await fetch(`/api/web-recipes?${searchParams.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          const recipes = data.items || [];
          
          // Prendre au moins maxResults recettes pour ce type (pour offrir de la variété)
          let addedForType = 0;
          for (const recipe of recipes) {
            if (!seenUrls.has(recipe.url) && addedForType < maxResults) {
              seenUrls.add(recipe.url);
              allRecipes.push({
                ...recipe,
                typeRepas: typeRepas === "petit-dejeuner" ? "dejeuner" : typeRepas,
              });
              addedForType++;
            }
          }
          
          console.log(`✅ ${addedForType} recette(s) trouvée(s) pour ${quantite} ${typeRepasLabel}`);
        }
      };
      
      // Rechercher pour chaque type de repas avec sa quantité spécifique
      await searchRecipesForType("petit-dejeuner", nbDejeuners, "déjeuner(s)");
      await searchRecipesForType("diner", nbDiners, "dîner(s)");
      await searchRecipesForType("souper", nbSoupers, "souper(s)");
      
      // Filtrer les desserts (les utilisateurs veulent des repas, pas des desserts)
      const recipesWithoutDesserts = allRecipes.filter(recipe => {
        const titleLower = (recipe.title || "").toLowerCase();
        const snippetLower = (recipe.snippet || "").toLowerCase();
        const fullText = `${titleLower} ${snippetLower}`;
        
        // Exclure si c'est un dessert
        const dessertKeywords = ["dessert", "gâteau", "gateau", "tarte", "biscuit", "cookie", "muffin", "brownie", "pudding", "crème brûlée", "tiramisu", "cheesecake", "sorbet", "glace", "sorbet", "panna cotta"];
        const isDessert = dessertKeywords.some(keyword => fullText.includes(keyword));
        
        return !isDessert;
      });
      
      console.log(`🚫 ${allRecipes.length - recipesWithoutDesserts.length} dessert(s) filtré(s)`);
      
      // Afficher toutes les recettes trouvées (on a déjà limité par type)
      const recipesToShow = recipesWithoutDesserts;
      
      if (recipesToShow.length < nombreTotalRepas) {
        toast.warning(`Seulement ${recipesToShow.length} recettes trouvées sur ${nombreTotalRepas} demandées`);
      } else {
        toast.success(`${recipesToShow.length} recettes trouvées pour ${nombreTotalRepas} repas demandés`);
      }
      
      // Ouvrir la modal de sélection avec les recettes générées
      setGeneratedRecipes(recipesToShow);
      setSelectedRecipeUrls(new Set()); // Réinitialiser la sélection
      setSelectionModalOpen(true);
    } catch (error) {
      console.error("Erreur lors de la génération des recettes:", error);
      toast.error("Une erreur est survenue lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        <div className="space-y-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Récapitulatif des préférences - Accordéon */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm dark:shadow-gray-900/30 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsPreferencesOpen(!isPreferencesOpen)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Récapitulatif de vos préférences
            </h3>
          </div>
          {isPreferencesOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {isPreferencesOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                {/* Budget */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Budget hebdomadaire
                      </span>
                    </div>
                    <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                      {budget}$
                    </span>
                  </div>
                </div>

                {/* Allergies */}
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Allergies ({selectedAllergies.size})
                    </span>
                  </div>
                  {selectedAllergies.size > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedAllergies).map((allergyId) => {
                        const allergy = COMMON_ALLERGIES.find((a) => a.id === allergyId);
                        if (!allergy) return null;
                        return (
                          <span
                            key={allergyId}
                            className="inline-block px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full border border-red-300 dark:border-red-700"
                          >
                            {allergy.nom}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Aucune allergie configurée
                    </p>
                  )}
                </div>

                {/* Aliments préférés */}
                <div className="bg-rose-50 dark:bg-rose-900/10 rounded-lg p-3 border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Aliments préférés ({selectedFavorites.size})
                    </span>
                  </div>
                  {selectedFavorites.size > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {getFoodNames(Array.from(selectedFavorites)).slice(0, 8).map((foodName, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-700"
                        >
                          {foodName}
                        </span>
                      ))}
                      {selectedFavorites.size > 8 && (
                        <span className="inline-block px-2 py-1 text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-700">
                          +{selectedFavorites.size - 8} autres
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Aucun aliment préféré configuré
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Génération de recettes de la semaine */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Générer les recettes de la semaine selon votre budget et vos allergies
          </h2>
        </div>

        <div className="space-y-4">
          {/* Nombre de jours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de jours (1-7)
            </label>
            <select
              value={nbJours}
              onChange={(e) => setNbJours(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((jour) => (
                <option key={jour} value={jour}>
                  {jour} jour{jour > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Types de repas avec quantités */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UtensilsCrossed className="w-4 h-4 inline mr-1" />
              Types de repas (quantité)
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Déjeuner</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="21"
                  value={nbDejeuners}
                  onChange={(e) => setNbDejeuners(Math.max(0, Math.min(21, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Dîner</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="21"
                  value={nbDiners}
                  onChange={(e) => setNbDiners(Math.max(0, Math.min(21, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Souper</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="21"
                  value={nbSoupers}
                  onChange={(e) => setNbSoupers(Math.max(0, Math.min(21, parseInt(e.target.value) || 0)))}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={respecterBudget}
                  onChange={(e) => setRespecterBudget(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <DollarSign className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Respecter Budget</span>
              </label>
            </div>
          </div>

          {/* Bouton générer */}
          <Button
            onClick={handleGenerateRecipes}
            disabled={generating || (nbDejeuners === 0 && nbDiners === 0 && nbSoupers === 0)}
            className="w-full !text-base !px-10 !py-2 hover:!scale-[1.01]"
            variant="primary"
            size="md"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5 mr-2" />
                Générer les recettes
              </>
            )}
          </Button>
          
          {/* Info sur le nombre de recettes et coût estimé */}
          {(nbDejeuners > 0 || nbDiners > 0 || nbSoupers > 0) ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {(() => {
                  const nombreTotalRepas = nbDejeuners + nbDiners + nbSoupers;
                  return `${nombreTotalRepas} repas demandé(s) : ${nbDejeuners} déjeuner(s), ${nbDiners} dîner(s), ${nbSoupers} souper(s)`;
                })()}
              </p>
              {respecterBudget && budget > 0 && (() => {
                const nombreTotalRepas = nbDejeuners + nbDiners + nbSoupers;
                const budgetPourNbJours = (budget / 7) * nbJours;
                const budgetParRepas = nombreTotalRepas > 0 ? budgetPourNbJours / nombreTotalRepas : 0;
                return (
                  <p className="text-xs text-orange-600 dark:text-orange-400 text-center font-medium">
                    💰 Budget pour {nbJours} jour(s) : ~{budgetPourNbJours.toFixed(2)}$ (~{budgetParRepas.toFixed(2)}$ par repas)
                  </p>
                );
              })()}
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal de sélection des recettes */}
      <Modal
        isOpen={selectionModalOpen}
        onClose={() => setSelectionModalOpen(false)}
        title="Sélectionner les recettes à ajouter"
        size="xl"
        onConfirm={async () => {
          if (selectedRecipeUrls.size === 0) {
            toast.error("Veuillez sélectionner au moins une recette");
            return;
          }

          const recipesToSave = generatedRecipes.filter(r => selectedRecipeUrls.has(r.url));
          
          let savedCount = 0;
          let errorCount = 0;
          let totalCost = 0;
          let totalIngredientsAdded = 0;

          for (const recipe of recipesToSave) {
            try {
              const cost = recipe.estimatedCost && typeof recipe.estimatedCost === 'number' 
                ? recipe.estimatedCost 
                : null;
              
              const finalCost = cost;
              // Préserver les portions de manière robuste
              let finalServings: number | null = null;
              if (recipe.servings !== null && recipe.servings !== undefined) {
                if (typeof recipe.servings === 'number' && recipe.servings > 0 && recipe.servings <= 50) {
                  finalServings = recipe.servings;
                } else if (typeof recipe.servings === 'string') {
                  const parsed = parseInt(recipe.servings, 10);
                  if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
                    finalServings = parsed;
                  }
                }
              }
              
              if (finalCost !== null && finalCost > 0) {
                totalCost += finalCost;
              }

              const payload: any = {
                titre: recipe.title,
                url: recipe.url,
                image: recipe.image || null,
                snippet: recipe.snippet || null,
                source: recipe.source || null,
                estimatedCost: finalCost !== null && finalCost !== undefined ? finalCost : null,
                servings: finalServings !== null && finalServings !== undefined ? finalServings : null,
              };
              
              // Ajouter spoonacularId et detailedCost si disponibles (pour ajout automatique des ingrédients)
              if (recipe.spoonacularId) {
                payload.spoonacularId = recipe.spoonacularId;
                console.log("📤 [QuickSettings] spoonacularId trouvé:", recipe.spoonacularId);
              }
              
              if (recipe.detailedCost) {
                payload.detailedCost = recipe.detailedCost;
                console.log("📤 [QuickSettings] detailedCost trouvé avec", recipe.detailedCost.ingredients?.length || 0, "ingrédients");
              }
              
              console.log("📤 [QuickSettings] Envoi de la recette:", {
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
                const hasIngredients = result.data?.ingredientsAdded || false;
                if (hasIngredients) {
                  totalIngredientsAdded++;
                  console.log("✅ [QuickSettings] Ingrédients ajoutés à la liste d'épicerie");
                  // Déclencher le rafraîchissement de la liste d'épicerie
                  window.dispatchEvent(new CustomEvent("liste-epicerie-updated"));
                }
                savedCount++;
              } else {
                if (response.status === 409) {
                  console.log("ℹ️ [Frontend] Recette déjà existante, ignorée");
                } else {
                  errorCount++;
                }
              }
            } catch (error) {
              console.error("Erreur lors de la sauvegarde d'une recette:", error);
              errorCount++;
            }
          }
          
          // Déclencher le rafraîchissement de RecettesSemaine
          window.dispatchEvent(new CustomEvent("recettes-semaine-updated"));
          
          if (savedCount > 0) {
            const costMessage = totalCost > 0 
              ? ` Coût approximatif total : ${totalCost.toFixed(2)}$`
              : "";
            
            const ingredientsMessage = totalIngredientsAdded > 0
              ? ` Les ingrédients de ${totalIngredientsAdded} recette${totalIngredientsAdded > 1 ? "s" : ""} ont été ajoutés à votre liste d'épicerie.`
              : "";
            
            toast.success(
              `${savedCount} recette${savedCount > 1 ? "s" : ""} ajoutée${savedCount > 1 ? "s" : ""} à la semaine !${costMessage}${ingredientsMessage}`,
              { duration: 6000 }
            );
          } else if (errorCount > 0) {
            toast.warning("Les recettes existent déjà dans votre semaine");
          }
          
          setSelectionModalOpen(false);
          setSelectedRecipeUrls(new Set());
        }}
        confirmText={`Ajouter ${selectedRecipeUrls.size} recette${selectedRecipeUrls.size > 1 ? "s" : ""}`}
        cancelText="Annuler"
      >
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {generatedRecipes.length} recette{generatedRecipes.length > 1 ? "s" : ""} trouvée{generatedRecipes.length > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedRecipeUrls(new Set(generatedRecipes.map(r => r.url)));
                }}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                Tout sélectionner
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={() => setSelectedRecipeUrls(new Set())}
                className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {generatedRecipes.map((recipe, index) => {
              const isSelected = selectedRecipeUrls.has(recipe.url);
              const cost = (recipe.estimatedCost !== null && recipe.estimatedCost !== undefined && typeof recipe.estimatedCost === 'number' && recipe.estimatedCost > 0)
                ? recipe.estimatedCost 
                : null;
              
              return (
                <motion.div
                  key={recipe.url}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`flex gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400"
                      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    const newSelected = new Set(selectedRecipeUrls);
                    if (newSelected.has(recipe.url)) {
                      newSelected.delete(recipe.url);
                    } else {
                      newSelected.add(recipe.url);
                    }
                    setSelectedRecipeUrls(newSelected);
                  }}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? "bg-orange-500 border-orange-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {recipe.image ? (
                      <img
                        src={recipe.image}
                        alt={recipe.title}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                        <UtensilsCrossed className="w-6 h-6 text-orange-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 break-words">
                      {recipe.title}
                    </h4>
                    {recipe.snippet && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2 break-words">
                        {recipe.snippet}
                      </p>
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {recipe.source || "Source inconnue"}
                        </span>
                        {(() => {
                          const servingsNum = recipe.servings 
                            ? (typeof recipe.servings === 'number' ? recipe.servings : parseInt(String(recipe.servings), 10))
                            : null;
                          const hasServings = servingsNum !== null && !isNaN(servingsNum) && servingsNum > 0;
                          
                          return hasServings ? (
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 whitespace-nowrap">
                              <Users className="w-3 h-3" />
                              {servingsNum} portion{servingsNum > 1 ? "s" : ""}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cost !== null && cost !== undefined && cost > 0 ? (
                          <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                            {(() => {
                              const servingsNum = recipe.servings 
                                ? (typeof recipe.servings === 'number' ? recipe.servings : parseInt(String(recipe.servings), 10))
                                : null;
                              const hasServings = servingsNum !== null && !isNaN(servingsNum) && servingsNum > 0;
                              
                              return hasServings ? (
                                <>
                                  ~{(cost / servingsNum).toFixed(2)}$/portion
                                  <span className="text-yellow-500 dark:text-yellow-400 ml-1 text-xs font-normal">
                                    ({servingsNum} portion{servingsNum > 1 ? "s" : ""})
                                  </span>
                                </>
                              ) : (
                                <>~{cost.toFixed(2)}$</>
                              );
                            })()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Prix non disponible
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Modal>
    </motion.div>
  );
}
