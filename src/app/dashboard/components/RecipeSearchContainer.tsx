"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import SearchBox from "./SearchBox";
import RecipeFinder from "./RecipeFinder";

interface Recipe {
  title: string;
  url: string;
  image: string | null;
  snippet: string;
  source: string;
}

export default function RecipeSearchContainer() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);

  // Fonction pour charger les allergies de l'utilisateur
  const loadUserAllergies = async (): Promise<string[]> => {
    try {
      const preferencesResponse = await fetch("/api/user/preferences");
      if (preferencesResponse.ok) {
        const prefsData = await preferencesResponse.json();
        if (prefsData.data?.allergies && Array.isArray(prefsData.data.allergies)) {
          return prefsData.data.allergies;
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des allergies:", error);
    }
    return [];
  };

  // Écouter l'événement personnalisé pour la recherche par budget depuis BudgetSelector
  useEffect(() => {
    const handleSearchByBudget = async (event: Event) => {
      const customEvent = event as CustomEvent<{ budget: number; typeRepas?: string; jourSemaine?: number }>;
      const { budget, typeRepas, jourSemaine } = customEvent.detail;
      // Recherche par Budget : UNIQUEMENT le budget, typeRepas et jourSemaine si fournis, AUCUN filtre supplémentaire
      const filters: string[] = [];
      if (typeRepas) filters.push(typeRepas);
      if (jourSemaine) filters.push(`jour-${jourSemaine}`);
      
      // Charger les allergies de l'utilisateur
      const allergies = await loadUserAllergies();
      
      handleSearch(
        'budget',
        [], // Pas d'ingrédients
        budget,
        allergies, // Allergies de l'utilisateur
        filters // Seulement typeRepas et jourSemaine si fournis
      );
    };

    const handleSearchByFavorites = async (event: Event) => {
      const customEvent = event as CustomEvent<{ favorites: string[] }>;
      const { favorites } = customEvent.detail;
      // Recherche par Aliments Favoris : UNIQUEMENT les aliments favoris et les allergies, AUCUN filtre ni budget
      if (!favorites || favorites.length === 0) {
        toast.warning("Aucun aliment favori sélectionné");
        return;
      }

      // Charger les allergies de l'utilisateur
      const allergies = await loadUserAllergies();
      
      // Convertir les IDs en noms d'aliments
      const { getFoodNames } = await import("../../../../lib/utils/foodItems");
      const preferredItemNames = getFoodNames(favorites);
      
      handleSearch(
        'favorites',
        preferredItemNames, // Aliments favoris
        null, // Pas de budget
        allergies, // Allergies de l'utilisateur
        [] // Pas de filtres
      );
    };

    window.addEventListener('searchByBudget', handleSearchByBudget);
    window.addEventListener('searchByFavorites', handleSearchByFavorites);
    return () => {
      window.removeEventListener('searchByBudget', handleSearchByBudget);
      window.removeEventListener('searchByFavorites', handleSearchByFavorites);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (
    searchType: 'budget' | 'pantry' | 'favorites' | 'general',
    ingredients: string[],
    budget: number | null,
    allergies: string[],
    filters: string[]
  ) => {
    try {
      setSearching(searchType);
      setLoading(true);

      const filtersParam = filters.join(",");
      const ingredientNames = ingredients.join(",");
      const allergiesParam = allergies.join(",");
      
      console.log(`🔍 [${searchType}] Recherche avec ingrédients:`, ingredientNames);
      console.log(`🔍 [${searchType}] Budget:`, budget);
      console.log(`🚫 [${searchType}] Exclusion des allergies:`, allergiesParam);
      console.log(`🏷️ [${searchType}] Filtres:`, filtersParam);

      // Extraire typeRepas et jourSemaine des filtres si présents
      const typeRepasFilter = filters.find(f => ['dejeuner', 'diner', 'souper'].includes(f));
      const jourSemaineFilter = filters.find(f => f.startsWith('jour-'));
      const jourSemaine = jourSemaineFilter ? jourSemaineFilter.replace('jour-', '') : '';
      
      // Construire les paramètres de recherche
      const searchParams = new URLSearchParams({
        ingredients: ingredientNames,
        ...(budget && { budget: budget.toString() }),
        allergies: allergiesParam,
        filters: filtersParam,
        ...(typeRepasFilter && { typeRepas: typeRepasFilter }),
        ...(jourSemaine && { jourSemaine }),
      });

      const response = await fetch(`/api/web-recipes?${searchParams.toString()}`);

      const contentType = response.headers.get("content-type");
      let data: any = {};
      
      try {
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error("Réponse non-JSON:", text);
          throw new Error("Réponse invalide du serveur");
        }
      } catch (parseError) {
        console.error("Erreur lors du parsing de la réponse:", parseError);
        toast.error("Erreur lors de la lecture de la réponse du serveur");
        return;
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `Erreur HTTP ${response.status}`;
        
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

      const foundRecipes = data.items || [];
      setRecipes(foundRecipes);
      
      if (foundRecipes.length === 0) {
        toast.warning("Aucune recette trouvée. Essayez avec d'autres critères.");
      } else if (data.cached) {
        toast.success(`${foundRecipes.length} recette${foundRecipes.length > 1 ? "s" : ""} trouvée${foundRecipes.length > 1 ? "s" : ""} (cache)`);
      } else {
        toast.success(`${foundRecipes.length} recette${foundRecipes.length > 1 ? "s" : ""} trouvée${foundRecipes.length > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Erreur lors de la recherche de recettes:", error);
      toast.error("Une erreur est survenue lors de la recherche");
      setRecipes([]);
    } finally {
      setLoading(false);
      setSearching(null);
    }
  };

  return (
    <>
      <SearchBox onSearch={handleSearch} searching={searching} loading={loading} />
      <RecipeFinder recipes={recipes} loading={loading} />
    </>
  );
}

