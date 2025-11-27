"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, ExternalLink, Trash2, Loader2, Trash, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";

interface RecetteSemaine {
  id: string;
  titre: string;
  url: string;
  image: string | null;
  snippet: string | null;
  source: string | null;
  estimatedCost: number | null;
  servings: number | null;
  createdAt: string;
}

export default function RecettesSemaine() {
  const [recettes, setRecettes] = useState<RecetteSemaine[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; recetteId: string | null; recetteTitre: string }>({
    isOpen: false,
    recetteId: null,
    recetteTitre: "",
  });
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Charger les recettes au montage et écouter les mises à jour
  useEffect(() => {
    fetchRecettes();
    
    // Écouter les événements de mise à jour
    const handleUpdate = () => {
      fetchRecettes();
    };
    
    window.addEventListener("recettes-semaine-updated", handleUpdate);
    return () => {
      window.removeEventListener("recettes-semaine-updated", handleUpdate);
    };
  }, []);

  const fetchRecettes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/recettes-semaine");
      if (response.ok) {
        const result = await response.json();
        const recettesData = result.data || [];
        setRecettes(Array.isArray(recettesData) ? recettesData : []);
        console.log(`✅ [RecettesSemaine] ${recettesData.length} recette(s) chargée(s)`);
      } else {
        const errorText = await response.text();
        console.error("❌ [RecettesSemaine] Erreur API:", response.status, response.statusText, errorText);
        setRecettes([]);
      }
    } catch (error) {
      console.error("❌ [RecettesSemaine] Erreur lors du chargement des recettes:", error);
      setRecettes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string, titre: string) => {
    setDeleteModal({ isOpen: true, recetteId: id, recetteTitre: titre });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.recetteId) return;

    try {
      const response = await fetch(`/api/recettes-semaine?id=${deleteModal.recetteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Recette supprimée de la semaine");
        fetchRecettes();
        setDeleteModal({ isOpen: false, recetteId: null, recetteTitre: "" });
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Une erreur est survenue");
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recettes de la semaine</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
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
          <Calendar className="w-5 h-5 text-white" />
        </motion.div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Recettes de la semaine
        </h2>
        <div className="ml-auto flex items-center gap-3">
          {recettes.length > 0 && (
            <>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {recettes.length} recette{recettes.length > 1 ? "s" : ""}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDeleteAllModal(true)}
                disabled={deletingAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash className="w-4 h-4" />
                    Tout supprimer
                  </>
                )}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {recettes.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-600 dark:text-gray-300 py-8"
          >
            Aucune recette sélectionnée pour cette semaine.
            <br />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Utilisez le bouton "+" sur les recettes trouvées pour les ajouter.
            </span>
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2"
          >
            <AnimatePresence>
              {recettes.map((recette, index) => (
                <motion.div
                  key={recette.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group"
                >
                  {/* Miniature */}
                  <div className="flex-shrink-0">
                    {recette.image ? (
                      <img
                        src={recette.image}
                        alt={recette.titre}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                        onClick={() => window.open(recette.url, '_blank')}
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
                        onClick={() => window.open(recette.url, '_blank')}
                      >
                        <Calendar className="w-8 h-8 text-orange-400 dark:text-orange-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors cursor-pointer"
                      onClick={() => window.open(recette.url, '_blank')}
                    >
                      {recette.titre}
                    </h4>
                    {recette.snippet && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {recette.snippet}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {recette.source || "Source inconnue"}
                        </span>
                        {recette.servings && recette.servings > 0 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {recette.servings} portion{recette.servings > 1 ? "s" : ""}
                          </span>
                        )}
                        {recette.estimatedCost !== null && recette.estimatedCost > 0 && (
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                            ~{recette.estimatedCost.toFixed(2)}$
                            {recette.servings && recette.servings > 0 && (
                              <span className="text-orange-500 dark:text-orange-400 ml-1">
                                ({(recette.estimatedCost / recette.servings).toFixed(2)}$/portion)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={recette.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteClick(recette.id, recette.titre)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmation de suppression d'une recette */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, recetteId: null, recetteTitre: "" })}
        title="Supprimer la recette"
        onConfirm={handleDeleteConfirm}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteModal.recetteTitre}</strong> de vos recettes de la semaine ?
          Cette action est irréversible.
        </p>
      </Modal>

      {/* Modal de confirmation de suppression de toutes les recettes */}
      <Modal
        isOpen={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        title="Supprimer toutes les recettes"
        onConfirm={async () => {
          try {
            setDeletingAll(true);
            const response = await fetch("/api/recettes-semaine?all=true", {
              method: "DELETE",
            });

            if (response.ok) {
              toast.success(`${recettes.length} recette${recettes.length > 1 ? "s" : ""} supprimée${recettes.length > 1 ? "s" : ""}`);
              fetchRecettes();
              setDeleteAllModal(false);
            } else {
              toast.error("Erreur lors de la suppression");
            }
          } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            toast.error("Une erreur est survenue");
          } finally {
            setDeletingAll(false);
          }
        }}
        variant="danger"
        confirmText="Tout supprimer"
        cancelText="Annuler"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer <strong>toutes les {recettes.length} recette{recettes.length > 1 ? "s" : ""}</strong> de votre semaine ?
          <br />
          <span className="text-red-600 dark:text-red-400 font-semibold">Cette action est irréversible.</span>
        </p>
      </Modal>
    </motion.div>
  );
}

