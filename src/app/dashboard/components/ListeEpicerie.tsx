"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Edit2, Check, X, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../../components/ui/modal";
import Button from "../../../components/ui/button";

interface LigneListe {
  id: string;
  nom: string;
  quantite: number;
  unite: string | null;
  prixEstime: number | null;
}

interface ListeEpicerie {
  id: string;
  lignes: LigneListe[];
  coutTotal: number | null;
}

export default function ListeEpicerie() {
  const [liste, setListe] = useState<ListeEpicerie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; ligneId: string | null; ligneNom: string }>({
    isOpen: false,
    ligneId: null,
    ligneNom: "",
  });

  const [formData, setFormData] = useState({
    nom: "",
    quantite: "",
    unite: "",
    prixEstime: "",
  });

  // Unités prédéfinies
  const unites = [
    "unité", "pièce", "tranche", "portion", "boîte", "paquet",
    "g", "kg", "oz", "lb",
    "ml", "L", "cl", "c. à soupe", "c. à café", "tasse"
  ];

  useEffect(() => {
    fetchListe();
  }, []);

  const fetchListe = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/liste-epicerie");
      if (response.ok) {
        const result = await response.json();
        setListe(result.data);
      } else {
        toast.error("Erreur lors du chargement de la liste");
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      quantite: "",
      unite: "",
      prixEstime: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        nom: formData.nom.trim(),
        quantite: parseFloat(formData.quantite),
        unite: formData.unite || null,
        prixEstime: formData.prixEstime ? parseFloat(formData.prixEstime) : null,
      };

      if (editingId) {
        // Mettre à jour
        const response = await fetch(`/api/liste-epicerie/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          toast.success("Item modifié avec succès");
          fetchListe();
          resetForm();
        } else {
          toast.error("Erreur lors de la modification");
        }
      } else {
        // Créer
        const response = await fetch("/api/liste-epicerie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          toast.success("Item ajouté à la liste");
          fetchListe();
          resetForm();
        } else {
          toast.error("Erreur lors de l'ajout");
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur est survenue");
    }
  };

  const handleEdit = (ligne: LigneListe) => {
    setEditingId(ligne.id);
    setFormData({
      nom: ligne.nom,
      quantite: ligne.quantite.toString(),
      unite: ligne.unite || "",
      prixEstime: ligne.prixEstime ? ligne.prixEstime.toString() : "",
    });
    setShowForm(true);
  };

  const handleDeleteClick = (id: string, nom: string) => {
    setDeleteModal({ isOpen: true, ligneId: id, ligneNom: nom });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.ligneId) return;

    try {
      const response = await fetch(`/api/liste-epicerie/${deleteModal.ligneId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Item supprimé de la liste");
        fetchListe();
        setDeleteModal({ isOpen: false, ligneId: null, ligneNom: "" });
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur est survenue");
    }
  };

  const calculerTotal = () => {
    if (!liste) return 0;
    return liste.lignes.reduce((total, ligne) => {
      return total + (ligne.prixEstime || 0);
    }, 0);
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
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Liste d'épicerie
          </h2>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          variant="primary"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {liste && liste.lignes.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total estimé:
            </span>
            <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
              {calculerTotal().toFixed(2)}$
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {liste && liste.lignes.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-600 dark:text-gray-300 py-8"
          >
            Votre liste d'épicerie est vide.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Cliquez sur "Ajouter" pour commencer.
            </span>
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2 max-h-[400px] overflow-y-auto pr-2"
          >
            {liste?.lignes.map((ligne, index) => (
              <motion.div
                key={ligne.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    {ligne.nom}
                  </h4>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      {ligne.quantite} {ligne.unite || "unité"}
                    </span>
                    {ligne.prixEstime && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {ligne.prixEstime.toFixed(2)}$
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(ligne)}
                    className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    aria-label="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(ligne.id, ligne.nom)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingId ? "Modifier l'item" : "Ajouter un item"}
          onConfirm={handleSubmit}
          variant="primary"
          confirmText={editingId ? "Modifier" : "Ajouter"}
          cancelText="Annuler"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom de l'item *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                placeholder="ex: Lait, Pain, Tomates..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantité *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unité
                </label>
                <select
                  value={formData.unite}
                  onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Aucune</option>
                  {unites.map((unite) => (
                    <option key={unite} value={unite}>
                      {unite}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix estimé ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.prixEstime}
                onChange={(e) => setFormData({ ...formData, prixEstime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0.00"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, ligneId: null, ligneNom: "" })}
        title="Supprimer l'item"
        onConfirm={handleDeleteConfirm}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteModal.ligneNom}</strong> de votre liste d'épicerie ?
        </p>
      </Modal>
    </motion.div>
  );
}

