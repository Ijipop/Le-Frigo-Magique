"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle, Heart, Save, Settings, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";
import CategoryItemSelector from "./CategoryItemSelector";
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

export default function Preferences() {
  const [budget, setBudget] = useState(100);
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set());
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set());
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
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

      // Charger les allergies, aliments préférés et code postal
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          setSelectedAllergies(new Set(prefsData.data.allergies));
        }
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          setSelectedFavorites(new Set(prefsData.data.alimentsPreferes));
        }
        if (prefsData.data?.codePostal) {
          setPostalCode(prefsData.data.codePostal);
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

      // Valider le format du code postal (format canadien: A1A1A1)
      const normalizedCode = postalCode.replace(/\s+/g, "").toUpperCase();
      if (normalizedCode && !/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalizedCode)) {
        toast.error("Format de code postal invalide. Utilisez le format canadien (ex: H1A1A1)");
        return;
      }

      // Sauvegarder les allergies, aliments préférés et code postal
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergies: Array.from(selectedAllergies),
          alimentsPreferes: Array.from(selectedFavorites),
          codePostal: normalizedCode || null,
        }),
      });
      
      setPostalCode(normalizedCode);

      // Déclencher un événement pour mettre à jour les autres composants
      window.dispatchEvent(new CustomEvent("preferences-updated"));

      toast.success("Préférences sauvegardées !");
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

  // Écouter les changements d'aliments préférés depuis CategoryItemSelector
  useEffect(() => {
    const handleFavoritesUpdate = async () => {
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const data = await response.json();
        if (data.data?.alimentsPreferes && Array.isArray(data.data.alimentsPreferes)) {
          setSelectedFavorites(new Set(data.data.alimentsPreferes));
        }
      }
    };

    window.addEventListener("preferences-updated", handleFavoritesUpdate);
    return () => {
      window.removeEventListener("preferences-updated", handleFavoritesUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        <div className="space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
      {/* En-tête avec bouton sauvegarder */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mes Préférences
            </h2>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Budget */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-3">
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
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, rgb(249 115 22) 0%, rgb(249 115 22) ${(budget / 1000) * 100}%, rgb(229 231 235) ${(budget / 1000) * 100}%, rgb(229 231 235) 100%)`,
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Ce budget sera utilisé pour les suggestions de recettes
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
              <div className="flex flex-wrap gap-2 mt-3">
                {Array.from(selectedAllergies).map((allergyId) => {
                  const allergy = COMMON_ALLERGIES.find((a) => a.id === allergyId);
                  if (!allergy) return null;
                  return (
                    <button
                      key={allergyId}
                      onClick={() => toggleAllergy(allergyId)}
                      className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-full text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1"
                    >
                      {allergy.nom}
                      <span className="text-red-500">×</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Les recettes contenant ces allergènes seront exclues des suggestions
            </p>
          </div>

          {/* Aliments préférés - Résumé */}
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Aliments préférés ({selectedFavorites.size})
              </span>
            </div>
            {selectedFavorites.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedFavorites).map((foodId) => {
                  const foodName = getFoodNames([foodId])[0];
                  return (
                    <button
                      key={foodId}
                      onClick={() => {
                        const newSelected = new Set(selectedFavorites);
                        newSelected.delete(foodId);
                        setSelectedFavorites(newSelected);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 rounded-full border border-rose-300 dark:border-rose-700 hover:bg-rose-200 dark:hover:bg-rose-900/40 transition-colors"
                      title="Retirer cet aliment"
                    >
                      {foodName}
                      <span className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200">×</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sélectionnez vos aliments préférés ci-dessous pour recevoir des suggestions personnalisées
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Vous pourrez rechercher des recettes avec ces aliments depuis la page FrigoPop
            </p>
          </div>

          {/* Code postal pour les circulaires */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-blue-500" />
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Code postal
              </span>
            </div>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="H1A1A1"
              maxLength={7}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Code postal pour trouver les circulaires d'épiceries près de chez vous
            </p>
          </div>
        </div>
      </div>

      {/* Sélection des aliments préférés */}
      <CategoryItemSelector />
    </motion.div>
  );
}

