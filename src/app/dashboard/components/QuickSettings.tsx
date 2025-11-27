"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle, Heart, Save, Settings, Calendar, UtensilsCrossed, Sparkles, Loader2, Check, X, Users } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";

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
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Nouveaux états pour la génération de recettes
  const [nbJours, setNbJours] = useState(7);
  const [dejeuner, setDejeuner] = useState(false);
  const [diner, setDiner] = useState(false);
  const [souper, setSouper] = useState(false);
  const [respecterBudget, setRespecterBudget] = useState(true);
  const [inspiration, setInspiration] = useState(false);
  const [postalCode, setPostalCode] = useState<string>("");
  
  // États pour la modal de sélection
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);
  const [selectedRecipeUrls, setSelectedRecipeUrls] = useState<Set<string>>(new Set());
  const [detailedCosts, setDetailedCosts] = useState<Map<string, { cost: number; loading: boolean; servings?: number; costPerServing?: number }>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  // Charger le code postal pour les calculs de prix
  useEffect(() => {
    const loadPostalCode = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          if (data.data?.codePostal) {
            setPostalCode(data.data.codePostal);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement du code postal:", error);
      }
    };
    loadPostalCode();
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

      // Charger les allergies
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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Sauvegarder le budget
      await fetch("/api/user/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetHebdomadaire: budget }),
      });

      // Sauvegarder les allergies et aliments préférés
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergies: Array.from(selectedAllergies),
          alimentsPreferes: Array.from(selectedFavorites),
        }),
      });

      toast.success("Paramètres sauvegardés !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const toggleAllergy = (allergyId: string) => {
    const newSelected = new Set(selectedAllergies);
    if (newSelected.has(allergyId)) {
      newSelected.delete(allergyId);
    } else {
      newSelected.add(allergyId);
    }
    setSelectedAllergies(newSelected);
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
      
      console.log(`🍳 Génération de ${minRecettesTotal} recettes minimum (${minRecettesParType} par type)`);
      
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
          
          // Prendre au moins minRecettesParType recettes pour ce type
          let addedForType = 0;
          for (const recipe of recipes) {
            if (!seenUrls.has(recipe.url) && addedForType < minRecettesParType * 2) {
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
          if (addedForType < minRecettesParType) {
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
                if (!seenUrls.has(recipe.url) && addedForType < minRecettesParType * 2) {
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
      
      // Limiter au nombre nécessaire (avec un peu de marge pour avoir du choix)
      const recipesToShow = allRecipes.slice(0, Math.max(minRecettesTotal * 2, allRecipes.length));
      
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Paramètres rapides
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
          size="sm"
        >
          <Save className="w-4 h-4 mr-1" />
          {saving ? "..." : "Sauver"}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Budget
              </span>
            </div>
            <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
              {budget}$
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            style={{
              background: `linear-gradient(to right, rgb(249 115 22) 0%, rgb(249 115 22) ${(budget / 1000) * 100}%, rgb(229 231 235) ${(budget / 1000) * 100}%, rgb(229 231 235) 100%)`,
            }}
          />
        </div>

        {/* Allergies */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Allergies ({selectedAllergies.size})
            </span>
          </div>
          <select
            onChange={(e) => {
              if (e.target.value) {
                toggleAllergy(e.target.value);
                e.target.value = "";
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Ajouter une allergie...</option>
            {COMMON_ALLERGIES.map((allergy) => (
              <option key={allergy.id} value={allergy.id}>
                {allergy.nom}
              </option>
            ))}
          </select>
          {selectedAllergies.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Array.from(selectedAllergies).map((allergyId) => {
                const allergy = COMMON_ALLERGIES.find((a) => a.id === allergyId);
                if (!allergy) return null;
                return (
                  <button
                    key={allergyId}
                    onClick={() => toggleAllergy(allergyId)}
                    className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-full text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    {allergy.nom} ×
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Aliments préférés */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aliments préférés ({selectedFavorites.size})
            </span>
          </div>
          {selectedFavorites.size > 0 ? (
            <div className="px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                {selectedFavorites.size} aliment{selectedFavorites.size > 1 ? "s" : ""} sélectionné{selectedFavorites.size > 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configurez vos aliments préférés dans la section dédiée ci-dessous
            </p>
          )}
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Générer les recettes de la semaine
            </span>
          </div>

          {/* Nombre de jours */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Nombre de jours (1-7)
            </label>
            <select
              value={nbJours}
              onChange={(e) => setNbJours(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((jour) => (
                <option key={jour} value={jour}>
                  {jour} jour{jour > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Types de repas */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              <UtensilsCrossed className="w-3 h-3 inline mr-1" />
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
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
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
                <DollarSign className="w-3 h-3 text-orange-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Respecter Budget</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inspiration}
                  onChange={(e) => setInspiration(e.target.checked)}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <Sparkles className="w-3 h-3 text-orange-500" />
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
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
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
                  const totalRecettes = nbJours * repasCount;
                  return `${totalRecettes} recette${totalRecettes > 1 ? "s" : ""} minimum seront générées`;
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
              
              // Vérifier si on a un calcul détaillé avec plus d'infos (servings, coût précis)
              const detailedCost = detailedCosts.get(recipe.url);
              const finalCost = detailedCost?.cost && detailedCost.cost > 0 
                ? detailedCost.cost 
                : cost;
              const finalServings = detailedCost?.servings || recipe.servings || null;
              
              if (finalCost !== null && finalCost > 0) {
                totalCost += finalCost;
              }

              const response = await fetch("/api/recettes-semaine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  titre: recipe.title,
                  url: recipe.url,
                  image: recipe.image || null,
                  snippet: recipe.snippet || null,
                  source: recipe.source || null,
                  estimatedCost: finalCost,
                  servings: finalServings,
                }),
              });
              
              if (response.ok) {
                savedCount++;
              } else {
                const errorData = await response.json();
                if (response.status !== 409) {
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
              const cost = recipe.estimatedCost && typeof recipe.estimatedCost === 'number' 
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
                        {recipe.servings && recipe.servings > 0 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 whitespace-nowrap">
                            <Users className="w-3 h-3" />
                            {recipe.servings} portion{recipe.servings > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cost !== null && cost > 0 && (
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                            ~{cost.toFixed(2)}$
                          </span>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const detailedCost = detailedCosts.get(recipe.url);
                            if (detailedCost?.loading) return;
                            
                            setDetailedCosts(prev => new Map(prev).set(recipe.url, { cost: 0, loading: true }));
                            
                            try {
                              const response = await fetch("/api/recipes/detailed-cost", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ url: recipe.url }),
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                const detailedData = data.data;
                                setDetailedCosts(prev => new Map(prev).set(recipe.url, { 
                                  cost: detailedData.totalCost, 
                                  loading: false,
                                  servings: detailedData.servings,
                                  costPerServing: detailedData.costPerServing,
                                }));
                                
                                const costMessage = detailedData.servings && detailedData.costPerServing
                                  ? `${detailedData.totalCost.toFixed(2)}$ (${detailedData.costPerServing.toFixed(2)}$/portion pour ${detailedData.servings} portions)`
                                  : `${detailedData.totalCost.toFixed(2)}$`;
                                toast.success(`Coût détaillé : ${costMessage}`);
                              } else {
                                const errorData = await response.json();
                                if (errorData.code === "ROBOTS_BLOCKED") {
                                  toast.error("Ce site bloque l'extraction automatique. Consultez la recette directement.");
                                } else {
                                  toast.error("Impossible de calculer le coût détaillé");
                                }
                                setDetailedCosts(prev => {
                                  const newMap = new Map(prev);
                                  newMap.delete(recipe.url);
                                  return newMap;
                                });
                              }
                            } catch (error) {
                              console.error("Erreur lors du calcul détaillé:", error);
                              toast.error("Erreur lors du calcul");
                              setDetailedCosts(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(recipe.url);
                                return newMap;
                              });
                            }
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          title="Calculer le coût détaillé (extraction légale des ingrédients)"
                        >
                          {detailedCosts.get(recipe.url)?.loading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              Détail
                            </>
                          )}
                        </button>
                        {detailedCosts.get(recipe.url)?.cost && !detailedCosts.get(recipe.url)?.loading && (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {detailedCosts.get(recipe.url)!.cost.toFixed(2)}$
                            </span>
                            {detailedCosts.get(recipe.url)?.servings && detailedCosts.get(recipe.url)?.costPerServing && (
                              <span className="text-xs text-blue-500 dark:text-blue-400">
                                {detailedCosts.get(recipe.url)!.costPerServing!.toFixed(2)}$/portion
                              </span>
                            )}
                          </div>
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

