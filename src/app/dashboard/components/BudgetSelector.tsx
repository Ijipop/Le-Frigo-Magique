"use client";

import { useState, useEffect } from "react";
import { DollarSign, Save } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";

export default function BudgetSelector() {
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/budget");
      if (response.ok) {
        const data = await response.json();
        if (data.data?.budgetHebdomadaire) {
          setBudget(data.data.budgetHebdomadaire);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du budget:", error);
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
        body: JSON.stringify({ budgetHebdomadaire: budget }),
      });

      if (response.ok) {
        toast.success(`Budget hebdomadaire sauvegardé : ${budget}$`);
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

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
          <DollarSign className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Budget hebdomadaire
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Montant sélectionné
          </span>
          <motion.span
            key={budget}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-bold text-orange-500 dark:text-orange-400"
          >
            {budget}$
          </motion.span>
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
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0$</span>
          <span>500$</span>
          <span>1000$</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          variant="primary"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Sauvegarde..." : "Sauvegarder le budget"}
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center"
      >
        Ce budget sera utilisé pour générer vos suggestions de recettes
      </motion.p>
    </motion.div>
  );
}

