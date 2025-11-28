"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";

export default function ChercherRabais() {
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

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

  const handleSearchDeals = async () => {
    try {
      setSearching(true);

      const response = await fetch("/api/flyers/search-deals");
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Erreur lors de la recherche");
        return;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        toast.success(`${data.totalMatches} rabais trouvés !`);
        // Déclencher un événement pour mettre à jour la liste d'épicerie
        window.dispatchEvent(new CustomEvent("deals-updated", { detail: data }));
      } else {
        toast.info("Aucun rabais trouvé pour vos ingrédients");
        // Déclencher quand même l'événement pour mettre à jour l'état
        window.dispatchEvent(new CustomEvent("deals-updated", { detail: data }));
      }
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700"
    >
      <Button
        onClick={handleSearchDeals}
        disabled={searching || !postalCode}
        variant="primary"
        className="w-full"
        size="md"
      >
        {searching ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Recherche en cours...
          </>
        ) : (
          <>
            <Search className="w-5 h-5 mr-2" />
            Chercher les rabais
          </>
        )}
      </Button>
      {!postalCode && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Configurez votre code postal dans l'onglet Préférences pour rechercher les rabais
        </p>
      )}
    </motion.div>
  );
}

