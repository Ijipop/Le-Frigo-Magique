"use client";

import { useState, useEffect } from "react";
import { Search, ChefHat, ExternalLink, Loader2, ChevronDown, ChevronUp, Check, Plus, X, Filter } from "lucide-react";
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
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set()); // URLs des recettes sélectionnées
  const [addingToWeek, setAddingToWeek] = useState<Set<string>>(new Set()); // URLs en cours d'ajout
  
  // Filtres de recherche
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
    ],
    regime: [
      { id: "vegetarien", label: "Végétarien", icon: "🌱" },
      { id: "vegan", label: "Végétalien", icon: "🌿" },
      { id: "sans-gluten", label: "Sans gluten", icon: "🌾" },
      { id: "keto", label: "Keto", icon: "🥑" },
      { id: "paleo", label: "Paléo", icon: "🦴" },
    ],
    caracteristiques: [
      { id: "rapide", label: "Rapide (< 30 min)", icon: "⚡" },
      { id: "economique", label: "Économique", icon: "💰" },
      { id: "sante", label: "Santé", icon: "💚" },
      { id: "comfort", label: "Réconfort", icon: "🍛" },
    ],
  };

  // Charger les données utilisateur au montage
  useEffect(() => {
    loadUserData();
    loadExistingRecettes();
    if (autoSearch) {
      // Attendre un peu pour que les données soient chargées
      setTimeout(() => {
        handleSearch();
      }, 500);
    }
  }, [autoSearch]);

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
    // Version qui retourne les données directement pour la recherche
    let currentBudget: number | null = budget;
    let currentPreferredItems: string[] = [...preferredItems];
    let currentPantryItems: string[] = [...pantryItems];
    let currentAllergies: string[] = [];

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

      // Charger les préférences (aliments préférés + allergies + régimes)
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.alimentsPreferes && Array.isArray(prefsData.data.alimentsPreferes)) {
          currentPreferredItems = prefsData.data.alimentsPreferes;
          setPreferredItems(currentPreferredItems);
        }
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          currentAllergies = prefsData.data.allergies;
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

  const handleSearch = async () => {
    try {
      setSearching(true);
      setLoading(true);

      // Recharger les données utilisateur avant chaque recherche pour avoir les dernières valeurs
      console.log("🔄 Rechargement des données utilisateur avant la recherche...");
      const { currentBudget, currentPreferredItems, currentPantryItems, currentAllergies } = await loadUserDataForSearch();

      // Construire la liste des ingrédients avec les données fraîchement chargées
      // Convertir les IDs d'aliments préférés en noms
      const preferredItemNames = getFoodNames(currentPreferredItems);
      let allIngredients = [...preferredItemNames, ...currentPantryItems];
      
      // Si le filtre "proteine" est sélectionné, prioriser les aliments riches en protéines
      if (selectedFilters.has("proteine")) {
        // Aliments riches en protéines (IDs et noms)
        const proteinRichIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "37", "47", "48", "50", "74", "75"];
        const proteinRichNames = [
          "poulet", "bœuf", "porc", "saumon", "dinde", "bacon", "steak", "côtelettes", "thon", "crevettes",
          "œufs", "oeufs", "haricots", "lentilles", "pois chiches", "noix", "amandes",
          "fromage", "yogourt", "fromage cottage", "mozzarella"
        ];
        
        // Identifier les aliments riches en protéines dans les préférences
        const proteinPreferredItems = currentPreferredItems
          .filter(id => proteinRichIds.includes(id))
          .map(id => getFoodNames([id])[0])
          .filter(Boolean);
        
        // Identifier les aliments riches en protéines dans le garde-manger
        const proteinPantryItems = currentPantryItems.filter(item => 
          proteinRichNames.some(proteinName => 
            item.toLowerCase().includes(proteinName.toLowerCase())
          )
        );
        
        // Réorganiser : protéines en premier, puis le reste
        const proteinItems = [...proteinPreferredItems, ...proteinPantryItems];
        const otherItems = allIngredients.filter(item => 
          !proteinItems.includes(item)
        );
        
        allIngredients = [...proteinItems, ...otherItems];
        
        console.log("💪 [Filtre Protéine] Aliments riches en protéines identifiés:", proteinItems);
      }
      
      console.log("📋 Ingrédients préférés:", preferredItemNames);
      console.log("📋 Articles du garde-manger:", currentPantryItems);
      console.log("📋 Tous les ingrédients (ordre final):", allIngredients);
      console.log("🚫 Allergies à exclure:", currentAllergies);
      
      if (allIngredients.length === 0) {
        toast.error("Veuillez sélectionner des aliments préférés ou ajouter des articles au garde-manger");
        setLoading(false);
        setSearching(false);
        return;
      }

      // Joindre les noms d'ingrédients pour la recherche
      const ingredientNames = allIngredients.join(",");
      const allergiesParam = currentAllergies.join(",");
      console.log("🔍 Recherche avec ingrédients:", ingredientNames);
      console.log("🚫 Exclusion des allergies:", allergiesParam);

      // Construire les paramètres de filtres
      const filtersParam = Array.from(selectedFilters).join(",");
      
      const response = await fetch(
        `/api/web-recipes?ingredients=${encodeURIComponent(ingredientNames)}&budget=${currentBudget || ""}&allergies=${encodeURIComponent(allergiesParam)}&filters=${encodeURIComponent(filtersParam)}`
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

      {/* Filtres de recherche */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtres de recherche</span>
          {selectedFilters.size > 0 && (
            <button
              onClick={() => setSelectedFilters(new Set())}
              className="ml-auto text-xs text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1"
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
      </motion.div>

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

