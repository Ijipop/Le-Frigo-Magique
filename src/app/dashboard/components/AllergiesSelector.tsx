"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";

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

export default function AllergiesSelector() {
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set());
  const [customAllergies, setCustomAllergies] = useState<Map<string, string>>(new Map()); // Map<id, nom>
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAllergyName, setNewAllergyName] = useState("");

  // Charger les allergies au montage
  useEffect(() => {
    const loadAllergies = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          if (data.data?.allergies && Array.isArray(data.data.allergies)) {
            const allergiesSet = new Set<string>();
            const customMap = new Map<string, string>();
            
            data.data.allergies.forEach((allergyId: string) => {
              allergiesSet.add(allergyId);
              // Si l'allergie n'est pas dans COMMON_ALLERGIES, c'est une allergie personnalisée
              const isCommon = COMMON_ALLERGIES.some(a => a.id === allergyId);
              if (!isCommon) {
                // Si l'ID commence par "custom:", extraire le nom, sinon utiliser l'ID comme nom
                if (allergyId.startsWith("custom:")) {
                  const name = allergyId.replace("custom:", "");
                  customMap.set(allergyId, name);
                } else {
                  // Ancien format : l'ID est directement le nom
                  customMap.set(allergyId, allergyId);
                }
              }
            });
            
            setSelectedAllergies(allergiesSet);
            setCustomAllergies(customMap);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des allergies:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAllergies();
  }, []);

  const toggleAllergy = (allergyId: string) => {
    const newSelected = new Set(selectedAllergies);
    if (newSelected.has(allergyId)) {
      newSelected.delete(allergyId);
    } else {
      newSelected.add(allergyId);
    }
    setSelectedAllergies(newSelected);
  };

  const handleAddCustomAllergy = () => {
    if (!newAllergyName.trim()) {
      toast.error("Veuillez entrer un nom d'allergie");
      return;
    }

    const trimmedName = newAllergyName.trim();
    const customId = `custom:${trimmedName.toLowerCase().replace(/\s+/g, "-")}`;
    
    // Vérifier si l'allergie existe déjà
    if (selectedAllergies.has(customId)) {
      toast.error("Cette allergie est déjà ajoutée");
      return;
    }

    // Ajouter l'allergie personnalisée
    const newSelected = new Set(selectedAllergies);
    newSelected.add(customId);
    setSelectedAllergies(newSelected);

    const newCustom = new Map(customAllergies);
    newCustom.set(customId, trimmedName);
    setCustomAllergies(newCustom);

    setNewAllergyName("");
    setAddModalOpen(false);
    toast.success(`${trimmedName} ajouté(e) !`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergies: Array.from(selectedAllergies),
        }),
      });

      if (response.ok) {
        toast.success("Allergies sauvegardées avec succès !");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50 mb-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3 mb-4"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="p-2 rounded-lg bg-gradient-to-br from-red-400 to-red-500"
        >
          <AlertTriangle className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Allergies / Intolérances
        </h2>
      </motion.div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Sélectionnez vos allergies et intolérances pour que nous puissions adapter nos suggestions de recettes.
      </p>

      {/* Menu déroulant */}
      <div className="mb-3">
        <select
          onChange={(e) => {
            if (e.target.value) {
              toggleAllergy(e.target.value);
              e.target.value = ""; // Reset le select
            }
          }}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
        >
          <option value="">Sélectionner une allergie/intolérance...</option>
          {COMMON_ALLERGIES.map((allergy) => (
            <option key={allergy.id} value={allergy.id}>
              {allergy.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Bouton d'ajout - Ergonomique pour mobile */}
      <motion.div 
        whileHover={{ scale: 1.02 }} 
        whileTap={{ scale: 0.98 }}
        className="mb-4"
      >
        <Button
          onClick={() => setAddModalOpen(true)}
          variant="primary"
          size="md"
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une allergie personnalisée
        </Button>
      </motion.div>

      {/* Liste des allergies sélectionnées */}
      {selectedAllergies.size > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4"
        >
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedAllergies).map((allergyId) => {
              // Chercher d'abord dans les allergies communes
              const commonAllergy = COMMON_ALLERGIES.find((a) => a.id === allergyId);
              // Sinon, chercher dans les allergies personnalisées
              const customAllergy = customAllergies.get(allergyId);
              
              const allergyName = commonAllergy?.nom || customAllergy || allergyId;
              
              return (
                <motion.button
                  key={allergyId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    toggleAllergy(allergyId);
                    // Si c'est une allergie personnalisée, la retirer aussi de la map
                    if (customAllergy) {
                      const newCustom = new Map(customAllergies);
                      newCustom.delete(allergyId);
                      setCustomAllergies(newCustom);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-full text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                >
                  {allergyName}
                  <span className="text-red-500">×</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bouton de sauvegarde */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
          size="sm"
          className="w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-1" />
          {saving ? "Sauvegarde..." : "Sauvegarder les allergies"}
        </Button>
      </motion.div>

      {/* Modal pour ajouter une allergie personnalisée */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewAllergyName("");
        }}
        title="Ajouter une allergie personnalisée"
        onConfirm={handleAddCustomAllergy}
        confirmText="Ajouter"
        cancelText="Annuler"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom de l'allergie/intolérance
            </label>
            <input
              type="text"
              value={newAllergyName}
              onChange={(e) => setNewAllergyName(e.target.value)}
              placeholder="Ex: Kiwi, Avocat, etc."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomAllergy();
                }
              }}
            />
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

