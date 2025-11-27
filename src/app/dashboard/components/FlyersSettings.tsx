"use client";

import { useState, useEffect } from "react";
import { MapPin, Save, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";

export default function FlyersSettings() {
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPostalCode();
  }, []);

  const loadPostalCode = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const data = await response.json();
        if (data.data?.codePostal) {
          setPostalCode(data.data.codePostal);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du code postal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Valider le format du code postal (format canadien: A1A1A1)
      const normalizedCode = postalCode.replace(/\s+/g, "").toUpperCase();
      if (normalizedCode && !/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalizedCode)) {
        toast.error("Format de code postal invalide. Utilisez le format canadien (ex: H1A1A1)");
        return;
      }

      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codePostal: normalizedCode || null,
        }),
      });

      toast.success("Code postal sauvegardé !");
      setPostalCode(normalizedCode);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
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
          <ShoppingBag className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Circulaires
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

      <div className="space-y-3">
        <div>
          <label className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Code postal
            </span>
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="H1A1A1"
            maxLength={7}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Code postal pour trouver les circulaires d'épiceries près de chez vous
          </p>
        </div>
      </div>
    </motion.div>
  );
}

