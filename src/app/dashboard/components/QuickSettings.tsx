"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertTriangle, Heart, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";

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
      </div>
    </motion.div>
  );
}

