"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save, Search, Calendar, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";

const TYPE_REPAS = [
  { value: "dejeuner", label: "Déjeuner" },
  { value: "diner", label: "Dîner" },
  { value: "souper", label: "Souper" },
];

const JOURS_SEMAINE = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 7, label: "Dimanche" },
];

export default function BudgetSelector() {
  const [budget, setBudget] = useState(100);
  const [typeRepas, setTypeRepas] = useState<string>("");
  const [jourSemaine, setJourSemaine] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchBudgetSettings();
  }, []);

  const fetchBudgetSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/budget");
      if (response.ok) {
        const data = await response.json();
        if (data.data?.budgetHebdomadaire) {
          setBudget(data.data.budgetHebdomadaire);
        }
        if (data.data?.typeRepasBudget) {
          setTypeRepas(data.data.typeRepasBudget);
        }
        if (data.data?.jourSemaineBudget) {
          setJourSemaine(data.data.jourSemaineBudget);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres budget:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetHebdomadaire: budget,
          typeRepasBudget: typeRepas || null,
          jourSemaineBudget: jourSemaine || null,
        }),
      });

      if (response.ok) {
        toast.success("Paramètres de budget sauvegardés !");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchByBudget = async () => {
    if (!budget || budget <= 0) {
      toast.error("Veuillez définir un budget");
      return;
    }

    try {
      setSearching(true);
      // Déclencher la recherche via l'événement window ou via un callback parent
      // Pour l'instant, on redirige vers la recherche avec les paramètres
      const searchParams = new URLSearchParams({
        budget: budget.toString(),
        ...(typeRepas && { typeRepas }),
        ...(jourSemaine && { jourSemaine: jourSemaine.toString() }),
      });
      
      // Déclencher un événement personnalisé pour que RecipeSearchContainer l'écoute
      window.dispatchEvent(new CustomEvent('searchByBudget', {
        detail: { budget, typeRepas, jourSemaine }
      }));
      
      toast.success("Recherche lancée !");
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
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
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-1.5 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
          >
            <DollarSign className="w-4 h-4 text-white" />
          </motion.div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Budget hebdomadaire
          </h2>
        </div>
        <motion.span
          key={budget}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="text-xl font-bold text-orange-500 dark:text-orange-400"
        >
          {budget}$
        </motion.span>
      </motion.div>

      {/* Menu déroulant : Type de repas */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-3"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <UtensilsCrossed className="w-4 h-4 inline mr-1" />
          Type de repas
        </label>
        <select
          value={typeRepas}
          onChange={(e) => setTypeRepas(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Sélectionner...</option>
          {TYPE_REPAS.map((repas) => (
            <option key={repas.value} value={repas.value}>
              {repas.label}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Menu déroulant : Jour de la semaine */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-3"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Jour de la semaine
        </label>
        <select
          value={jourSemaine}
          onChange={(e) => setJourSemaine(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Sélectionner...</option>
          {JOURS_SEMAINE.map((jour) => (
            <option key={jour.value} value={jour.value}>
              {jour.label}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Slider Budget */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-3"
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="w-4 h-4 inline mr-1" />
          Budget (${budget})
        </label>
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
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0$</span>
          <span>500$</span>
          <span>1000$</span>
        </div>
      </motion.div>

      {/* Texte d'aide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="mb-3"
      >
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          💡 Sélectionnez le type de repas, le jour et votre budget, puis cliquez sur "Rechercher par budget" pour trouver des recettes adaptées.
        </p>
      </motion.div>

      {/* Boutons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="space-y-2"
      >
        <Button
          onClick={handleSearchByBudget}
          disabled={searching || !budget || budget <= 0}
          className="w-full"
          variant="primary"
          size="sm"
        >
          <Search className="w-4 h-4 mr-2" />
          {searching ? "Recherche..." : "Rechercher par budget"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

