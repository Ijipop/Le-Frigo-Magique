"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Zap, Filter, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import { getFoodNames } from "../../../../lib/utils/foodItems";

interface SearchBoxProps {
  onSearch: (type: 'budget' | 'pantry' | 'favorites' | 'general', ingredients: string[], budget: number | null, allergies: string[], filters: string[]) => void;
  searching: string | null;
  loading: boolean;
}

export default function SearchBox({ onSearch, searching, loading }: SearchBoxProps) {
  const [budget, setBudget] = useState<number | null>(null);
  const [preferredItems, setPreferredItems] = useState<string[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  
  // Catégories de filtres disponibles
  const filterCategories = {
    type: [
      { id: "proteine", label: "Riche en protéines", icon: "💪" },
      { id: "dessert", label: "Dessert", icon: "🍰" },
      { id: "smoothie", label: "Smoothie", icon: "🥤" },
      { id: "soupe", label: "Soupe", icon: "🍲" },
      { id: "salade", label: "Salade", icon: "🥗" },
      { id: "petit-dejeuner", label: "Petit-déjeuner", icon: "🥞" },
      { id: "collation", label: "Collation", icon: "🍪" },
      { id: "pates", label: "Pâtes", icon: "🍝" },
      { id: "pizza", label: "Pizza", icon: "🍕" },
      { id: "grille", label: "Au grill", icon: "🔥" },
    ],
    regime: [
      { id: "vegetarien", label: "Végétarien", icon: "🌱" },
      { id: "vegan", label: "Végétalien", icon: "🌿" },
      { id: "sans-gluten", label: "Sans gluten", icon: "🌾" },
      { id: "keto", label: "Keto", icon: "🥑" },
      { id: "paleo", label: "Paléo", icon: "🦴" },
      { id: "halal", label: "Halal", icon: "🕌" },
      { id: "casher", label: "Casher", icon: "✡️" },
      { id: "pescetarien", label: "Pescétarien", icon: "🐟" },
    ],
    caracteristiques: [
      { id: "rapide", label: "Rapide (< 30 min)", icon: "⚡" },
      { id: "economique", label: "Économique", icon: "💰" },
      { id: "sante", label: "Santé", icon: "💚" },
      { id: "comfort", label: "Réconfort", icon: "🍛" },
      { id: "facile", label: "Facile", icon: "👶" },
      { id: "gourmet", label: "Gourmet", icon: "👨‍🍳" },
      { id: "sans-cuisson", label: "Sans cuisson", icon: "❄️" },
    ],
  };

  // Charger les données utilisateur au montage
  useEffect(() => {
    loadUserData();
  }, []);

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

      // Charger les préférences (aliments préférés + régimes pour filtres)
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          setPreferredItems(prefsData.data.alimentsPreferes);
        }
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          setAllergies(prefsData.data.allergies);
        }
        // Charger les préférences de régime pour les filtres automatiques
        if (prefsData.data?.vegetarien) {
          setSelectedFilters(prev => new Set([...prev, "vegetarien"]));
        }
        if (prefsData.data?.sansGluten) {
          setSelectedFilters(prev => new Set([...prev, "sans-gluten"]));
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

  const loadUserDataForSearch = async () => {
    let currentBudget: number | null = budget;
    let currentPreferredItems: string[] = [...preferredItems];
    let currentPantryItems: string[] = [...pantryItems];
    let currentAllergies: string[] = [...allergies];

    try {
      // Charger le budget
      const budgetResponse = await fetch("/api/user/budget");
      if (budgetResponse.ok) {
        const budgetData = await budgetResponse.json();
        if (budgetData.data?.budgetHebdomadaire) {
          currentBudget = budgetData.data.budgetHebdomadaire;
          setBudget(currentBudget);
        }
      }

      // Charger les préférences
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          currentPreferredItems = prefsData.data.alimentsPreferes;
          setPreferredItems(currentPreferredItems);
        }
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          currentAllergies = prefsData.data.allergies;
          setAllergies(currentAllergies);
        }
      }

      // Charger le garde-manger
      const pantryResponse = await fetch("/api/garde-manger");
      if (pantryResponse.ok) {
        const pantryData = await pantryResponse.json();
        if (pantryData.data && Array.isArray(pantryData.data)) {
          currentPantryItems = pantryData.data.map((item: any) => item.nom);
          setPantryItems(currentPantryItems);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données utilisateur:", error);
    }

    return { currentBudget, currentPreferredItems, currentPantryItems, currentAllergies };
  };

  const handleSearchByPantry = async () => {
    const { currentPantryItems, currentAllergies } = await loadUserDataForSearch();
    
    if (currentPantryItems.length === 0) {
      return;
    }

    // Recherche par Garde-Manger : UNIQUEMENT les ingrédients du garde-manger et les allergies, AUCUN filtre ni budget
    onSearch('pantry', currentPantryItems, null, currentAllergies, []);
  };

  const handleSearchByFavorites = async () => {
    const { currentPreferredItems, currentAllergies } = await loadUserDataForSearch();
    
    if (currentPreferredItems.length === 0) {
      return;
    }

    const preferredItemNames = getFoodNames(currentPreferredItems);
    // Recherche par Aliments Favoris : UNIQUEMENT les aliments favoris et les allergies, AUCUN filtre ni budget
    onSearch('favorites', preferredItemNames, null, currentAllergies, []);
  };

  const handleSearchGeneral = async () => {
    // Recherche rapide : utilise UNIQUEMENT les filtres sélectionnés, sans aliments préférés, garde-manger ou budget
    const { currentAllergies } = await loadUserDataForSearch();
    
    // Vérifier qu'au moins un filtre est sélectionné
    if (selectedFilters.size === 0) {
      return;
    }

    // Recherche par Filtres : UNIQUEMENT les filtres sélectionnés et les allergies, AUCUN ingrédient ni budget
    onSearch('general', [], null, currentAllergies, Array.from(selectedFilters));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3 mb-6"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
        >
          <Zap className="w-5 h-5 text-white" />
        </motion.div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recherche de recettes
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trouvez des recettes selon vos préférences
          </p>
        </div>
      </motion.div>

      {/* 2 boutons de recherche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Button
          onClick={handleSearchByPantry}
          disabled={searching !== null || loading}
          className="w-full h-12 font-medium transition-all hover:scale-105 active:scale-95"
          variant={searching === 'pantry' ? "primary" : "outline"}
          size="sm"
        >
          {searching === 'pantry' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Garde-manger
            </>
          )}
        </Button>

        <Button
          onClick={handleSearchByFavorites}
          disabled={searching !== null || loading}
          className="w-full h-12 font-medium transition-all hover:scale-105 active:scale-95"
          variant={searching === 'favorites' ? "primary" : "outline"}
          size="sm"
        >
          {searching === 'favorites' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <Heart className="w-4 h-4 mr-2" />
              Aliments Favoris
            </>
          )}
        </Button>
      </div>

      {/* Filtres de recherche */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtres</span>
          </div>
          {selectedFilters.size > 0 && (
            <button
              onClick={() => setSelectedFilters(new Set())}
              className="text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Type de plat */}
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Type de plat</p>
          <div className="flex flex-wrap gap-2">
            {filterCategories.type.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newFilters = new Set(selectedFilters);
                  if (newFilters.has(filter.id)) {
                    newFilters.delete(filter.id);
                  } else {
                    newFilters.add(filter.id);
                  }
                  setSelectedFilters(newFilters);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedFilters.has(filter.id)
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Régime alimentaire */}
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Régime alimentaire</p>
          <div className="flex flex-wrap gap-2">
            {filterCategories.regime.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newFilters = new Set(selectedFilters);
                  if (newFilters.has(filter.id)) {
                    newFilters.delete(filter.id);
                  } else {
                    newFilters.add(filter.id);
                  }
                  setSelectedFilters(newFilters);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedFilters.has(filter.id)
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Caractéristiques */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Caractéristiques</p>
          <div className="flex flex-wrap gap-2">
            {filterCategories.caracteristiques.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const newFilters = new Set(selectedFilters);
                  if (newFilters.has(filter.id)) {
                    newFilters.delete(filter.id);
                  } else {
                    newFilters.add(filter.id);
                  }
                  setSelectedFilters(newFilters);
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  selectedFilters.has(filter.id)
                    ? "bg-orange-500 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Bouton Recherche rapide */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-2"
        >
          <Button
            onClick={handleSearchGeneral}
            disabled={searching !== null || loading || selectedFilters.size === 0}
            className="w-full h-12 font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            variant={selectedFilters.size > 0 ? "primary" : "outline"}
            size="sm"
          >
            {searching === 'general' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recherche en cours...
              </>
            ) : selectedFilters.size > 0 ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Recherche rapide ({selectedFilters.size} filtre{selectedFilters.size > 1 ? "s" : ""})
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Recherche rapide (sélectionnez des filtres)
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

