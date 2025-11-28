"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle, Heart, Settings, Calendar, UtensilsCrossed, Loader2, Check, Users, Star } from "lucide-react";
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
  const [dejeuner, setDejeuner] = useState(false);
  const [diner, setDiner] = useState(false);
  const [souper, setSouper] = useState(false);
  const [respecterBudget, setRespecterBudget] = useState(true);
  const [inspiration, setInspiration] = useState(false);
  
  // États pour la modal de sélection
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);
  const [selectedRecipeUrls, setSelectedRecipeUrls] = useState<Set<string>>(new Set());

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
    if (!dejeuner && !diner && !souper) {
      toast.error("Veuillez sélectionner au moins un type de repas");
      return;
    }

    try {
      setGenerating(true);
      
      // Calculer le nombre minimum de recettes nécessaires par type de repas
      const repasTypes: string[] = [];
      if (dejeuner) repasTypes.push("petit-dejeuner");
      if (diner) repasTypes.push("diner");
      if (souper) repasTypes.push("souper");
      
      const minRecettesParType = nbJours;
      const minRecettesTotal = nbJours * repasTypes.length;
      // Toujours générer au moins 15-20 recettes pour offrir de la variété, même si l'utilisateur en demande moins
      const targetRecettesParType = Math.max(minRecettesParType * 2, 15); // Au moins 15 par type pour avoir du choix
      const targetRecettesTotal = Math.max(minRecettesTotal * 2, 20); // Au moins 20 au total pour avoir du choix
      
      console.log(`🍳 Génération de ${targetRecettesTotal} recettes cibles (minimum ${minRecettesTotal} demandées, ${targetRecettesParType} par type)`);
      
      // Construire les filtres de base (sans les types de repas)
      const baseFilters: string[] = [];
      if (respecterBudget) baseFilters.push("economique");
      if (inspiration) baseFilters.push("gourmet");
      
      // Faire une recherche pour chaque type de repas
      const allRecipes: any[] = [];
      const seenUrls = new Set<string>();
      
      for (const typeRepas of repasTypes) {
        const filtersForSearch = [typeRepas, ...baseFilters];
        
        const searchParams = new URLSearchParams({
          ingredients: "",
          ...(respecterBudget && budget > 0 ? { budget: budget.toString() } : {}),
          allergies: Array.from(selectedAllergies).join(","),
          filters: filtersForSearch.join(","),
        });
        
        console.log(`🔍 Recherche pour ${typeRepas}...`);
        const response = await fetch(`/api/web-recipes?${searchParams.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          const recipes = data.items || [];
          
          // Prendre au moins targetRecettesParType recettes pour ce type (pour offrir de la variété)
          let addedForType = 0;
          for (const recipe of recipes) {
            if (!seenUrls.has(recipe.url) && addedForType < targetRecettesParType) {
              seenUrls.add(recipe.url);
              allRecipes.push({
                ...recipe,
                typeRepas: typeRepas === "petit-dejeuner" ? "dejeuner" : typeRepas,
              });
              addedForType++;
            }
          }
          
          console.log(`✅ ${addedForType} recettes trouvées pour ${typeRepas}`);
          
          // Si on n'a pas assez, faire une recherche supplémentaire sans filtre de type
          if (addedForType < targetRecettesParType) {
            const additionalSearchParams = new URLSearchParams({
              ingredients: "",
              ...(respecterBudget && budget > 0 ? { budget: budget.toString() } : {}),
              allergies: Array.from(selectedAllergies).join(","),
              filters: baseFilters.join(","),
            });
            
            const additionalResponse = await fetch(`/api/web-recipes?${additionalSearchParams.toString()}`);
            if (additionalResponse.ok) {
              const additionalData = await additionalResponse.json();
              const additionalRecipes = additionalData.items || [];
              
              for (const recipe of additionalRecipes) {
                if (!seenUrls.has(recipe.url) && addedForType < targetRecettesParType) {
                  seenUrls.add(recipe.url);
                  allRecipes.push({
                    ...recipe,
                    typeRepas: typeRepas === "petit-dejeuner" ? "dejeuner" : typeRepas,
                  });
                  addedForType++;
                }
              }
            }
          }
        }
      }
      
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
      
      // Toujours montrer au moins targetRecettesTotal recettes pour offrir de la variété
      // Mais ne pas dépasser ce qu'on a trouvé
      const recipesToShow = recipesWithoutDesserts.slice(0, Math.max(targetRecettesTotal, recipesWithoutDesserts.length));
      
      if (recipesToShow.length < minRecettesTotal) {
        toast.warning(`Seulement ${recipesToShow.length} recettes trouvées sur ${minRecettesTotal} demandées`);
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
      {/* Récapitulatif des préférences */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Récapitulatif de vos préférences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Budget */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  Budget hebdomadaire
                </span>
              </div>
              <span className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                {budget}$
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Modifiez votre budget dans l'onglet Préférences
            </p>
          </div>

          {/* Allergies */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Allergies ({selectedAllergies.size})
              </span>
            </div>
            {selectedAllergies.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedAllergies).map((allergyId) => {
                  const allergy = COMMON_ALLERGIES.find((a) => a.id === allergyId);
                  if (!allergy) return null;
                  return (
                    <span
                      key={allergyId}
                      className="inline-block px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full border border-red-300 dark:border-red-700"
                    >
                      {allergy.nom}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aucune allergie configurée
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Modifiez vos allergies dans l'onglet Préférences
            </p>
          </div>

          {/* Aliments préférés */}
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Aliments préférés ({selectedFavorites.size})
              </span>
            </div>
            {selectedFavorites.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {getFoodNames(Array.from(selectedFavorites)).slice(0, 10).map((foodName, index) => (
                  <span
                    key={index}
                    className="inline-block px-3 py-1.5 text-sm bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-700"
                  >
                    {foodName}
                  </span>
                ))}
                {selectedFavorites.size > 10 && (
                  <span className="inline-block px-3 py-1.5 text-sm bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-700">
                    +{selectedFavorites.size - 10} autres
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aucun aliment préféré configuré
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Modifiez vos aliments préférés dans l'onglet Préférences
            </p>
          </div>
        </div>
      </div>

      {/* Génération de recettes de la semaine */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Générer les recettes de la semaine
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

          {/* Types de repas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UtensilsCrossed className="w-4 h-4 inline mr-1" />
              Types de repas
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dejeuner}
                  onChange={(e) => setDejeuner(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Déjeuner</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diner}
                  onChange={(e) => setDiner(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Dîner</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={souper}
                  onChange={(e) => setSouper(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Souper</span>
              </label>
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspiration}
                  onChange={(e) => setInspiration(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <Star className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Inspiration</span>
              </label>
            </div>
          </div>

          {/* Bouton générer */}
          <Button
            onClick={handleGenerateRecipes}
            disabled={generating || (!dejeuner && !diner && !souper)}
            className="w-full"
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
                Générer les recettes de la semaine
              </>
            )}
          </Button>
          
          {/* Info sur le nombre de recettes et coût estimé */}
          {dejeuner || diner || souper ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {(() => {
                  const repasCount = [dejeuner, diner, souper].filter(Boolean).length;
                  const minRecettes = nbJours * repasCount;
                  if (minRecettes >= 10) {
                    return `10 à 15 recettes seront générées (minimum ${minRecettes} demandées)`;
                  } else {
                    return `10 à 15 recettes seront générées`;
                  }
                })()}
              </p>
              {respecterBudget && budget > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 text-center font-medium">
                  💰 Coût approximatif estimé : ~{(nbJours * [dejeuner, diner, souper].filter(Boolean).length * (budget / 7)).toFixed(2)}$
                </p>
              )}
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

              const payload = {
                titre: recipe.title,
                url: recipe.url,
                image: recipe.image || null,
                snippet: recipe.snippet || null,
                source: recipe.source || null,
                estimatedCost: finalCost !== null && finalCost !== undefined ? finalCost : null,
                servings: finalServings !== null && finalServings !== undefined ? finalServings : null,
              };
              
              const response = await fetch("/api/recettes-semaine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              
              if (response.ok) {
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
            
            toast.success(
              `${savedCount} recette${savedCount > 1 ? "s" : ""} ajoutée${savedCount > 1 ? "s" : ""} à la semaine !${costMessage}`,
              { duration: 5000 }
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
