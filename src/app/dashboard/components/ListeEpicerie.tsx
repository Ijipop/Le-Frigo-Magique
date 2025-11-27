"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Edit2, Check, X, DollarSign, Tag, Star, Sparkles, ChevronDown } from "lucide-react";
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

interface DealMatch {
  ingredient: string;
  matchedItem: {
    id: string;
    name: string;
    current_price: number | null;
    original_price: number | null;
  };
  savings: number | null;
  estimatedOriginalPrice?: number;
  isEstimated?: boolean;
}

interface FlyerResult {
  flyer: {
    id: number;
    merchant: string;
  };
  matches: DealMatch[];
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
  const [dealsResults, setDealsResults] = useState<{ results: FlyerResult[] } | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    nom: "",
    quantite: "1",
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

  // Charger les rabais quand la liste change
  useEffect(() => {
    if (liste && liste.lignes.length > 0) {
      fetchDeals();
    } else {
      setDealsResults(null);
    }
  }, [liste]);

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
      quantite: "1",
      unite: "",
      prixEstime: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmitForm = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validation côté client
    if (!formData.nom.trim()) {
      toast.error("Le nom de l'item est requis");
      return;
    }

    const quantiteStr = formData.quantite.trim();
    if (!quantiteStr) {
      toast.error("La quantité est requise");
      return;
    }

    const quantite = parseFloat(quantiteStr);
    if (isNaN(quantite)) {
      toast.error("La quantité doit être un nombre valide");
      return;
    }

    if (quantite <= 0) {
      toast.error("La quantité doit être supérieure à 0");
      return;
    }

    let prixEstime: number | null = null;
    if (formData.prixEstime && formData.prixEstime.trim()) {
      const parsed = parseFloat(formData.prixEstime);
      if (!isNaN(parsed) && parsed >= 0) {
        prixEstime = parsed;
      }
    }

    try {
      const data = {
        nom: formData.nom.trim(),
        quantite,
        unite: formData.unite || null,
        prixEstime,
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
          const errorData = await response.json();
          console.error("Erreur API:", errorData);
          toast.error(errorData.details?.[0]?.message || errorData.error || "Erreur lors de l'ajout");
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Une erreur est survenue");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    handleSubmitForm(e);
  };

  const handleConfirm = () => {
    handleSubmitForm();
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

  const fetchDeals = async () => {
    try {
      setLoadingDeals(true);
      const response = await fetch("/api/flyers/search-deals");
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setDealsResults({ results: data.results });
        } else {
          setDealsResults(null);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des rabais:", error);
    } finally {
      setLoadingDeals(false);
    }
  };

  // Trouver tous les deals pour un ingrédient, groupés par épicerie
  const getAllDealsForIngredient = (ingredientName: string): Array<{
    price: number;
    originalPrice: number | null;
    savings: number | null;
    merchant: string;
    productName: string;
  }> => {
    if (!dealsResults || !dealsResults.results) {
      return [];
    }
    
    // Normaliser le nom de l'ingrédient pour le matching
    const normalizedIngredient = ingredientName.toLowerCase().trim();
    const allDeals: Array<{
      price: number;
      originalPrice: number | null;
      savings: number | null;
      merchant: string;
      productName: string;
    }> = [];
    
    // Parcourir tous les résultats de flyers
    for (const result of dealsResults.results) {
      for (const match of result.matches) {
        // Vérifier si le match correspond à l'ingrédient
        const normalizedMatch = match.ingredient.toLowerCase().trim();
        if (normalizedMatch === normalizedIngredient || 
            normalizedIngredient.includes(normalizedMatch) ||
            normalizedMatch.includes(normalizedIngredient)) {
          // Utiliser le prix en rabais (current_price) s'il est disponible
          const currentPrice = match.matchedItem.current_price;
          if (currentPrice) {
            allDeals.push({
              price: currentPrice,
              originalPrice: match.matchedItem.original_price || match.estimatedOriginalPrice || null,
              savings: match.savings,
              merchant: result.flyer.merchant,
              productName: match.matchedItem.name || null,
            });
          }
        }
      }
    }
    
    // Trier par prix (du moins cher au plus cher)
    return allDeals.sort((a, b) => a.price - b.price);
  };

  // Trouver le meilleur prix (en rabais) et les détails pour un ingrédient (pour compatibilité)
  const getBestDealForIngredient = (ingredientName: string): { 
    price: number | null; 
    originalPrice: number | null; 
    savings: number | null; 
    merchant: string | null; 
    productName: string | null; 
  } => {
    const allDeals = getAllDealsForIngredient(ingredientName);
    if (allDeals.length === 0) {
      return { price: null, originalPrice: null, savings: null, merchant: null, productName: null };
    }
    
    // Retourner le meilleur deal (premier dans la liste triée = moins cher)
    const bestDeal = allDeals[0];
    return {
      price: bestDeal.price,
      originalPrice: bestDeal.originalPrice,
      savings: bestDeal.savings,
      merchant: bestDeal.merchant,
      productName: bestDeal.productName,
    };
  };

  // Trouver le meilleur prix (en rabais) pour un ingrédient (pour compatibilité)
  const getBestPriceForIngredient = (ingredientName: string): number | null => {
    return getBestDealForIngredient(ingredientName).price;
  };

  const calculerTotal = () => {
    if (!liste) return { total: 0, totalAvecRabais: 0, economie: 0 };
    
    let total = 0;
    let totalAvecRabais = 0;
    
    liste.lignes.forEach((ligne) => {
      // Calculer le prix total pour cette ligne (prix unitaire * quantité)
      const prixUnitaireEstime = ligne.prixEstime || 0;
      const quantite = ligne.quantite || 1;
      const prixTotalEstime = prixUnitaireEstime * quantite;
      total += prixTotalEstime;
      
      // Chercher un prix en rabais pour cet ingrédient
      const prixUnitaireRabais = getBestPriceForIngredient(ligne.nom);
      if (prixUnitaireRabais !== null) {
        // Multiplier le prix unitaire en rabais par la quantité
        const prixTotalRabais = prixUnitaireRabais * quantite;
        totalAvecRabais += prixTotalRabais;
      } else {
        // Si pas de rabais trouvé, utiliser le prix estimé total
        totalAvecRabais += prixTotalEstime;
      }
    });
    
    const economie = total - totalAvecRabais;
    
    return { total, totalAvecRabais, economie };
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

      {liste && liste.lignes.length > 0 && (() => {
        const { total, totalAvecRabais, economie } = calculerTotal();
        const hasDeals = dealsResults && dealsResults.results.length > 0;
        
        return (
          <div className="mb-4 space-y-2">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {hasDeals ? "Total avec rabais:" : "Total estimé:"}
                </span>
                <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                  {totalAvecRabais.toFixed(2)}$
                </span>
              </div>
            </div>
            {hasDeals && economie > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Économie totale:
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-green-500 dark:text-green-400">
                      -{economie.toFixed(2)}$
                    </span>
                    {total > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                        {total.toFixed(2)}$
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {loadingDeals && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                Recherche de rabais en cours...
              </div>
            )}
          </div>
        );
      })()}

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
            {liste?.lignes.map((ligne, index) => {
              const deal = getBestDealForIngredient(ligne.nom);
              const hasDeal = deal.price !== null;
              const quantite = ligne.quantite || 1;
              const prixTotalRabais = hasDeal ? deal.price! * quantite : null;
              const prixTotalEstime = ligne.prixEstime ? ligne.prixEstime * quantite : null;
              
              const isExpanded = expandedItems.has(ligne.id);
              const allDeals = hasDeal ? getAllDealsForIngredient(ligne.nom) : [];
              const dealsByMerchant = allDeals.length > 0 ? allDeals.reduce((acc, deal) => {
                const merchant = deal.merchant || "Autre";
                if (!acc[merchant]) {
                  acc[merchant] = [];
                }
                acc[merchant].push(deal);
                return acc;
              }, {} as Record<string, typeof allDeals>) : {};
              
              return (
                <motion.div
                  key={ligne.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`rounded-lg border overflow-hidden ${
                    hasDeal 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                      : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {/* En-tête cliquable */}
                  <button
                    onClick={() => {
                      setExpandedItems(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(ligne.id)) {
                          newSet.delete(ligne.id);
                        } else {
                          newSet.add(ligne.id);
                        }
                        return newSet;
                      });
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {ligne.nom}
                        </h4>
                        {hasDeal && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              En rabais
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          {ligne.quantite} {ligne.unite || "unité"}
                        </span>
                        {hasDeal && prixTotalRabais !== null ? (
                          <div className="flex items-center gap-2">
                            {deal.originalPrice && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                {(deal.originalPrice * quantite).toFixed(2)}$
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                              <DollarSign className="w-3 h-3" />
                              {prixTotalRabais.toFixed(2)}$
                            </span>
                            {deal.savings && deal.savings > 0 && (
                              <span className="text-xs text-green-500 font-medium">
                                (-{(deal.savings * quantite).toFixed(2)}$)
                              </span>
                            )}
                          </div>
                        ) : prixTotalEstime !== null ? (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {prixTotalEstime.toFixed(2)}$
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasDeal && allDeals.length > 0 && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </motion.div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(ligne);
                        }}
                        className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        aria-label="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(ligne.id, ligne.nom);
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>

                  {/* Contenu déroulant avec les rabais groupés par épicerie */}
                  {hasDeal && allDeals.length > 0 && (
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 space-y-1.5">
                            {Object.entries(dealsByMerchant).sort((a, b) => a[0].localeCompare(b[0])).map(([merchant, deals]) => (
                              <div key={merchant} className="bg-white dark:bg-gray-800 rounded p-2 border border-green-200 dark:border-green-800">
                                <div className="font-semibold text-green-600 dark:text-green-400 mb-1.5 text-xs uppercase tracking-wide">
                                  {merchant}
                                </div>
                                {deals.map((deal, idx) => (
                                  <div key={idx} className="text-gray-600 dark:text-gray-400 text-xs pl-2 border-l-2 border-green-300 dark:border-green-700 mb-1 last:mb-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="italic truncate flex-1">{deal.productName}</span>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {deal.originalPrice && (
                                          <span className="text-gray-400 dark:text-gray-500 line-through text-xs">
                                            {deal.originalPrice.toFixed(2)}$
                                          </span>
                                        )}
                                        <span className="font-semibold text-green-600 dark:text-green-400">
                                          {deal.price.toFixed(2)}$
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulaire d'ajout/modification */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={resetForm}
          title={editingId ? "Modifier l'item" : "Ajouter un item"}
          onConfirm={handleConfirm}
          variant="default"
          confirmText={editingId ? "Modifier" : "Ajouter"}
          cancelText="Annuler"
        >
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom de l'item *
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
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
                  min="0.01"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
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

