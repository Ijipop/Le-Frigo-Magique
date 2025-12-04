"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, ExternalLink, Trash2, Loader2, Trash, Users, Heart, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";
import { getFallbackPrice } from "../../../../lib/utils/priceFallback";

interface RecetteSemaine {
  id: string;
  titre: string;
  url: string;
  image: string | null;
  snippet: string | null;
  source: string | null;
  estimatedCost: number | null;
  coutReel: number | null; // Coût réel calculé depuis les ingrédients liés
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
  const [favoriteRecipes, setFavoriteRecipes] = useState<Set<string>>(new Set());
  const [addingToFavorites, setAddingToFavorites] = useState<Set<string>>(new Set());
  const [budgetHebdomadaire, setBudgetHebdomadaire] = useState<number | null>(null);
  const [sousTotalEpicerie, setSousTotalEpicerie] = useState<number | null>(null);
  const [dynamicEpicerieTotal, setDynamicEpicerieTotal] = useState<number>(0); // Initialisé à 0 par défaut

  // Charger le budget de l'utilisateur
  const fetchBudget = async () => {
    try {
      const response = await fetch("/api/user/budget");
      if (response.ok) {
        const result = await response.json();
        if (result.data?.budgetHebdomadaire) {
          setBudgetHebdomadaire(result.data.budgetHebdomadaire);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du budget:", error);
    }
  };

  // Charger le sous-total estimé de la liste d'épicerie
  const fetchSousTotalEpicerie = async () => {
    try {
      const response = await fetch("/api/liste-epicerie");
      if (response.ok) {
        const result = await response.json();
        const liste = result.data;
        if (liste && liste.lignes) {
          // 🎯 LOGIQUE SAAS PRO: Calculer le sous-total avec les prix du produit complet
          // Utiliser le fallback (prix du produit complet) comme dans ListeEpicerie
          let totalAvecRabais = 0;
          liste.lignes.forEach((ligne: any) => {
            // Ignorer ligne.prixEstime car il peut contenir des prix ajustés
            // Utiliser toujours le fallback (prix du produit complet)
            const fallback = getFallbackPrice(ligne.nom);
            const prixProduitComplet = fallback?.prix || 2.00;
            totalAvecRabais += prixProduitComplet;
          });
          setSousTotalEpicerie(totalAvecRabais);
        } else {
          setSousTotalEpicerie(0);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement du sous-total:", error);
      setSousTotalEpicerie(null);
    }
  };

  // Charger les recettes au montage et écouter les mises à jour
  useEffect(() => {
    fetchRecettes();
    loadExistingFavorites();
    fetchBudget();
    fetchSousTotalEpicerie();
    
    // Écouter les événements de mise à jour
    const handleUpdate = () => {
      fetchRecettes();
      fetchSousTotalEpicerie(); // Recalculer le sous-total quand les recettes changent
    };
    
    window.addEventListener("recettes-semaine-updated", handleUpdate);
    window.addEventListener("liste-epicerie-updated", handleUpdate); // Écouter aussi les mises à jour de la liste
    
    // Écouter les mises à jour du total dynamique de l'épicerie
    const handleEpicerieTotalUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Accepter soit { detail: { total } } soit { detail: number }
      const total = customEvent.detail?.total !== undefined 
        ? customEvent.detail.total 
        : typeof customEvent.detail === 'number' 
        ? customEvent.detail 
        : 0;
      
      // Toujours mettre à jour, même si c'est 0 (aucune épicerie sélectionnée)
      console.log("💰 [RecettesSemaine] Total épicerie mis à jour:", total);
      setDynamicEpicerieTotal(total);
    };
    
    window.addEventListener("epicerie-total-updated", handleEpicerieTotalUpdate);
    
    return () => {
      window.removeEventListener("recettes-semaine-updated", handleUpdate);
      window.removeEventListener("liste-epicerie-updated", handleUpdate);
      window.removeEventListener("epicerie-total-updated", handleEpicerieTotalUpdate);
    };
  }, []);

  // Charger les recettes favorites
  const loadExistingFavorites = async () => {
    try {
      const response = await fetch("/api/recettes-favorites");
      if (response.ok) {
        const result = await response.json();
        const favoritesData = result.data || [];
        if (Array.isArray(favoritesData) && favoritesData.length > 0) {
          const urls = favoritesData.map((r: { url: string }) => r.url);
          setFavoriteRecipes(new Set(urls));
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
    }
  };

  const fetchRecettes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/recettes-semaine");
      if (response.ok) {
        const result = await response.json();
        const recettesData = result.data || [];
        setRecettes(Array.isArray(recettesData) ? recettesData : []);
        console.log(`✅ [RecettesSemaine] ${recettesData.length} recette(s) chargée(s)`);
        // Log pour déboguer les prix et portions
        if (recettesData.length > 0) {
          console.log("💰 [RecettesSemaine] Prix et portions des recettes:", recettesData.map((r: any) => ({
            titre: r.titre,
            estimatedCost: r.estimatedCost,
            hasCost: r.estimatedCost !== null && r.estimatedCost !== undefined && r.estimatedCost > 0,
            servings: r.servings,
            servingsType: typeof r.servings,
            hasServings: r.servings !== null && r.servings !== undefined && r.servings > 0
          })));
        }
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

  const handleToggleFavorite = async (recette: RecetteSemaine) => {
    if (addingToFavorites.has(recette.url)) {
      return;
    }

    try {
      setAddingToFavorites(new Set([...addingToFavorites, recette.url]));

      if (favoriteRecipes.has(recette.url)) {
        // Retirer des favoris
        const response = await fetch(`/api/recettes-favorites?url=${encodeURIComponent(recette.url)}`, {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success(`"${recette.titre}" retirée des favoris`);
          setFavoriteRecipes(new Set([...favoriteRecipes].filter(url => url !== recette.url)));
          window.dispatchEvent(new CustomEvent("favoris-updated"));
        } else {
          toast.error("Erreur lors de la suppression");
        }
      } else {
        // Ajouter aux favoris
        const response = await fetch("/api/recettes-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titre: recette.titre,
            url: recette.url,
            image: recette.image,
            snippet: recette.snippet,
            source: recette.source,
            estimatedCost: recette.estimatedCost,
            servings: recette.servings,
          }),
        });

        if (response.ok) {
          toast.success(`"${recette.titre}" ajoutée aux favoris !`);
          setFavoriteRecipes(new Set([...favoriteRecipes, recette.url]));
          window.dispatchEvent(new CustomEvent("favoris-updated"));
        } else {
          const error = await response.json();
          if (response.status === 409) {
            toast.info("Cette recette est déjà dans vos favoris");
            setFavoriteRecipes(new Set([...favoriteRecipes, recette.url]));
          } else {
            toast.error(error.error || "Erreur lors de l'ajout aux favoris");
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la gestion des favoris:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setAddingToFavorites(new Set([...addingToFavorites].filter(url => url !== recette.url)));
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
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-lg dark:shadow-gray-900/50 overflow-hidden"
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

      {/* Widget de suivi du budget */}
      {budgetHebdomadaire && budgetHebdomadaire > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4"
        >
          {(() => {
            // 🎯 PRIORITÉ: Utiliser le sous-total dynamique de l'épicerie (si épiceries sélectionnées)
            // C'est le prix réel que l'épicerie va coûter basé sur les épiceries sélectionnées
            // Sinon, utiliser le sous-total estimé de la liste d'épicerie
            // En dernier recours, utiliser les coûts estimés des recettes
            const budgetUtilise = (() => {
              // Si des épiceries sont sélectionnées (total > 0), utiliser le total dynamique
              // C'est le montant réel que l'épicerie va coûter
              if (dynamicEpicerieTotal > 0) {
                return dynamicEpicerieTotal;
              }
              // Sinon (aucune épicerie sélectionnée), utiliser le sous-total estimé de la liste d'épicerie
              if (sousTotalEpicerie !== null && sousTotalEpicerie > 0) {
                return sousTotalEpicerie;
              }
              // En dernier recours, utiliser les coûts estimés des recettes
              return recettes.reduce((total, recette) => {
                const cost = recette.coutReel !== null && recette.coutReel !== undefined 
                  ? recette.coutReel 
                  : recette.estimatedCost;
                if (cost !== null && cost !== undefined && cost > 0) {
                  return total + cost;
                }
                return total;
              }, 0);
            })();
            
            // Budget hebdomadaire
            const budgetTotal = budgetHebdomadaire || 0;
            const budgetRestant = budgetTotal - budgetUtilise;
            const pourcentageUtilise = budgetTotal > 0 ? (budgetUtilise / budgetTotal) * 100 : 0;
            
            // Déterminer la couleur selon le pourcentage
            const getColor = () => {
              if (pourcentageUtilise <= 80) return "green";
              if (pourcentageUtilise <= 100) return "orange";
              return "red";
            };
            
            const color = getColor();
            const colorClasses = {
              green: "bg-green-500 dark:bg-green-600",
              orange: "bg-orange-500 dark:bg-orange-600",
              red: "bg-red-500 dark:bg-red-600",
            };
            
            const textColorClasses = {
              green: "text-green-700 dark:text-green-300",
              orange: "text-orange-700 dark:text-orange-300",
              red: "text-red-700 dark:text-red-300",
            };
            
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-5 h-5 ${textColorClasses[color]}`} />
                    <h3 className={`text-sm font-semibold ${textColorClasses[color]}`}>
                      Suivi du budget
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {budgetRestant >= 0 ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-sm font-bold ${textColorClasses[color]}`}>
                      {budgetRestant >= 0 ? `${budgetRestant.toFixed(2)}$ restant` : `${Math.abs(budgetRestant).toFixed(2)}$ dépassé`}
                    </span>
                  </div>
                </div>
                
                {/* Barre de progression */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pourcentageUtilise, 100)}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full ${colorClasses[color]}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      Utilisé: {budgetUtilise.toFixed(2)}$ CAD / {budgetTotal.toFixed(2)}$ CAD
                    </span>
                    <span className="font-medium">
                      {pourcentageUtilise.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {/* Suggestions intelligentes */}
                {budgetRestant < 0 && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-300">
                      ⚠️ Vous avez dépassé votre budget de {Math.abs(budgetRestant).toFixed(2)}$ CAD. 
                      Considérez supprimer des recettes coûteuses ou chercher des alternatives moins chères.
                    </p>
                  </div>
                )}
                {budgetRestant >= 0 && budgetRestant < budgetTotal * 0.1 && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      💡 Il vous reste seulement {budgetRestant.toFixed(2)}$ CAD. 
                      Cherchez des recettes économiques pour rester dans votre budget.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      )}

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
            className="space-y-2.5 max-h-[500px] overflow-y-auto overflow-x-hidden pr-1 md:pr-2"
          >
            <AnimatePresence>
              {recettes.map((recette, index) => (
                <motion.div
                  key={recette.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => window.open(recette.url, '_blank')}
                  className="flex gap-3 p-2 md:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group overflow-hidden cursor-pointer"
                >
                  {/* Miniature */}
                  <div className="flex-shrink-0">
                    {recette.image && !recette.image.includes('foodista.com') ? (
                      <img
                        src={recette.image}
                        alt={recette.titre}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        loading="lazy"
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
                        className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600"
                      >
                        <Calendar className="w-8 h-8 text-orange-400 dark:text-orange-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors"
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
                        {(() => {
                          // Vérifier servings de manière robuste (peut être number, string, ou null)
                          const servingsNum = recette.servings 
                            ? (typeof recette.servings === 'number' ? recette.servings : parseInt(String(recette.servings), 10))
                            : null;
                          const hasServings = servingsNum !== null && !isNaN(servingsNum) && servingsNum > 0;
                          
                          return hasServings ? (
                            <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {servingsNum !== null ? `${servingsNum} portion${servingsNum > 1 ? "s" : ""}` : "Portions inconnues"}
                            </span>
                          ) : null;
                        })()}
                        {(() => {
                          // 🎯 PRIORITÉ: Utiliser le prix de l'épicerie (le plus fiable)
                          // 1. Si une seule recette et dynamicEpicerieTotal > 0, utiliser ce total
                          // 2. Sinon, utiliser coutReel (calculé avec fallback - prix du produit complet)
                          // 3. En dernier recours, utiliser estimatedCost
                          
                          let cost: number | null = null;
                          
                          // Si une seule recette et qu'on a un total d'épicerie, l'utiliser
                          if (recettes.length === 1 && dynamicEpicerieTotal > 0) {
                            cost = dynamicEpicerieTotal;
                          } else if (recette.coutReel !== null && recette.coutReel !== undefined && recette.coutReel > 0) {
                            // Utiliser coutReel (calculé avec fallback - prix du produit complet)
                            cost = recette.coutReel;
                          } else if (recette.estimatedCost !== null && recette.estimatedCost !== undefined && recette.estimatedCost > 0) {
                            // En dernier recours, utiliser estimatedCost
                            cost = recette.estimatedCost;
                          }
                          
                          if (cost !== null && cost !== undefined && cost > 0) {
                            // Vérifier servings de manière robuste
                            const servingsNum = recette.servings 
                              ? (typeof recette.servings === 'number' ? recette.servings : parseInt(String(recette.servings), 10))
                              : null;
                            const hasServings = servingsNum !== null && !isNaN(servingsNum) && servingsNum > 0;
                            
                            // cost est le coût TOTAL de la recette
                            const costPerServing = hasServings && servingsNum !== null ? (cost / servingsNum) : null;
                            
                            return (
                              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                <span className="font-bold">~{cost.toFixed(2)}$ CAD</span>
                                {costPerServing !== null && servingsNum !== null && (
                                  <span className="text-yellow-500 dark:text-yellow-400 ml-1 text-xs font-normal">
                                    ({costPerServing.toFixed(2)}$/portion • {servingsNum} portion{servingsNum > 1 ? "s" : ""})
                                  </span>
                                )}
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                Prix non disponible
                              </span>
                            );
                          }
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(recette);
                          }}
                          disabled={addingToFavorites.has(recette.url)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            favoriteRecipes.has(recette.url)
                              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          }`}
                          aria-label={favoriteRecipes.has(recette.url) ? "Retirer des favoris" : "Ajouter aux favoris"}
                        >
                          {addingToFavorites.has(recette.url) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Heart className={`w-4 h-4 ${favoriteRecipes.has(recette.url) ? "fill-current" : ""}`} />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(recette.id, recette.titre);
                          }}
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

