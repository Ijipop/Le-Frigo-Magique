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

  // Écouter l'événement personnalisé pour la recherche par budget depuis BudgetSelector
  useEffect(() => {
    const handleSearchByBudget = (event: CustomEvent) => {
      const { budget, typeRepas, jourSemaine } = event.detail;
      handleSearch(
        'budget',
        [],
        budget,
        [],
        [
          ...(typeRepas ? [typeRepas] : []),
          ...(jourSemaine ? [`jour-${jourSemaine}`] : []),
        ]
      );
    };

    window.addEventListener('searchByBudget', handleSearchByBudget as EventListener);
    return () => {
      window.removeEventListener('searchByBudget', handleSearchByBudget as EventListener);
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

