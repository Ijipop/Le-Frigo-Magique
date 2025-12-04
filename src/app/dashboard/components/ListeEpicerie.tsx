"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Edit2, Check, X, DollarSign, Tag, Star, Sparkles, ChevronDown, Trash, Store, List, ArrowUpDown, ArrowUpAZ } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../../components/ui/modal";
import Button from "../../../components/ui/button";
import { matchIngredients } from "../../../../lib/utils/ingredientMatcher";
import AccordionEpiceries from "./AccordionEpiceries";
import { getFallbackPrice } from "../../../../lib/utils/priceFallback";

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
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [dealsResults, setDealsResults] = useState<{ results: FlyerResult[] } | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());
  const [dynamicTotal, setDynamicTotal] = useState<number>(0); // Initialisé à 0 par défaut
  const [isListExpanded, setIsListExpanded] = useState<boolean>(true); // État pour l'accordéon de la liste
  const [ingredientPrices, setIngredientPrices] = useState<Record<string, number>>({}); // Cache des prix unitaires
  
  // Charger la préférence de tri depuis localStorage
  const [sortBy, setSortBy] = useState<"default" | "alphabetical">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("liste-epicerie-sort");
      return (saved === "alphabetical" || saved === "default") ? saved : "default";
    }
    return "default";
  });
  
  // Sauvegarder la préférence de tri dans localStorage
  const handleSortChange = (newSort: "default" | "alphabetical") => {
    setSortBy(newSort);
    if (typeof window !== "undefined") {
      localStorage.setItem("liste-epicerie-sort", newSort);
    }
  };

  // Charger les épiceries sélectionnées depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedMerchants");
    if (saved) {
      try {
        const merchants = JSON.parse(saved) as string[];
        const merchantsSet = new Set<string>(merchants);
        setSelectedMerchants(merchantsSet);
        // Si aucune épicerie n'est sélectionnée, s'assurer que le total est à 0
        if (merchantsSet.size === 0) {
          setDynamicTotal(0);
          window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
        }
      } catch (e) {
        console.error("Erreur lors du chargement des épiceries sélectionnées:", e);
        // En cas d'erreur, s'assurer que le total est à 0
        setDynamicTotal(0);
        window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
      }
    } else {
      // Aucune épicerie sauvegardée, s'assurer que le total est à 0
      setDynamicTotal(0);
      window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
    }
  }, []);

  // Sauvegarder les épiceries sélectionnées dans localStorage
  useEffect(() => {
    if (selectedMerchants.size > 0) {
      localStorage.setItem("selectedMerchants", JSON.stringify(Array.from(selectedMerchants)));
    } else {
      localStorage.removeItem("selectedMerchants");
    }
  }, [selectedMerchants]);

  // Toggle la sélection d'une épicerie
  const handleMerchantToggle = (merchant: string) => {
    setSelectedMerchants((prev) => {
      const next = new Set(prev);
      if (next.has(merchant)) {
        next.delete(merchant);
      } else {
        next.add(merchant);
      }
      // Si aucune épicerie n'est sélectionnée, remettre le total à 0
      if (next.size === 0) {
        setDynamicTotal(0);
        window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
      }
      return next;
    });
  };

  // Gérer le changement de total dynamique
  const handleTotalChange = (total: number) => {
    // Si aucune épicerie n'est sélectionnée, le total doit être 0
    const finalTotal = selectedMerchants.size > 0 ? total : 0;
    setDynamicTotal(finalTotal);
    // Dispatcher un événement pour mettre à jour le budget dans RecettesSemaine
    window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: finalTotal } }));
  };
  
  // 🎯 NOUVEAU: Écouter les demandes de recalcul du total (quand on revient sur l'onglet)
  useEffect(() => {
    const handleRecalculate = () => {
      // Si des épiceries sont sélectionnées et qu'on a des deals, recalculer le total
      if (selectedMerchants.size > 0 && dealsResults && dealsResults.results.length > 0) {
        // Le total sera recalculé automatiquement par AccordionEpiceries via onTotalChange
        // On déclenche juste un événement pour forcer le recalcul
        const event = new CustomEvent("force-recalculate-total");
        window.dispatchEvent(event);
      } else if (selectedMerchants.size === 0) {
        // Aucune épicerie sélectionnée, mettre le total à 0
        setDynamicTotal(0);
        window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
      }
    };
    
    window.addEventListener("recalculate-epicerie-total", handleRecalculate);
    
    // Écouter aussi les changements de visibilité de la page pour recalculer le total
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedMerchants.size > 0 && dealsResults && dealsResults.results.length > 0) {
        // La page est visible et des épiceries sont sélectionnées, recalculer le total
        handleRecalculate();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("recalculate-epicerie-total", handleRecalculate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedMerchants, dealsResults]);

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

  // Charger les prix unitaires pour les items sans rabais
  useEffect(() => {
    if (!liste || liste.lignes.length === 0) {
      setIngredientPrices({});
      return;
    }

    const fetchPrices = async () => {
      const prices: Record<string, number> = {};
      
      for (const ligne of liste.lignes) {
        // Si l'item a déjà un prix estimé, l'utiliser directement (c'est déjà le prix unitaire)
        if (ligne.prixEstime !== null && ligne.prixEstime !== undefined && ligne.prixEstime > 0) {
          prices[ligne.id] = ligne.prixEstime; // Prix unitaire
        } else {
          // Sinon, chercher dans la BD via l'API
          try {
            const response = await fetch(`/api/ingredient-price?ingredient=${encodeURIComponent(ligne.nom)}`);
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data?.prix) {
                prices[ligne.id] = result.data.prix;
              }
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération du prix pour ${ligne.nom}:`, error);
          }
        }
      }
      
      setIngredientPrices(prices);
    };

    fetchPrices();
  }, [liste]);

  // Écouter les événements de mise à jour des deals
  useEffect(() => {
    const handleDealsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        // Mettre à jour directement avec les résultats reçus
        const data = customEvent.detail;
        if (data.results && data.results.length > 0) {
          setDealsResults({ results: data.results });
        } else {
          setDealsResults(null);
        }
      }
    };
    
    window.addEventListener("deals-updated", handleDealsUpdate);
    return () => {
      window.removeEventListener("deals-updated", handleDealsUpdate);
    };
  }, []);

  // Réinitialiser les sélections si la liste est vide
  useEffect(() => {
    if (!liste || liste.lignes.length === 0) {
      setSelectedMerchants((prev) => {
        if (prev.size > 0) {
          setDynamicTotal(0);
          window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
          return new Set();
        }
        return prev;
      });
    }
  }, [liste]);

  // Filtrer les épiceries sélectionnées pour ne garder que celles qui ont encore des deals
  useEffect(() => {
    if (!dealsResults || !dealsResults.results || dealsResults.results.length === 0) {
      // Si pas de deals, réinitialiser les sélections
      setSelectedMerchants((prev) => {
        if (prev.size > 0) {
          setDynamicTotal(0);
          window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
          return new Set();
        }
        return prev;
      });
      return;
    }

    // Obtenir la liste des épiceries disponibles dans les deals
    const availableMerchants = new Set(
      dealsResults.results.map((r: any) => r.flyer.merchant.toLowerCase())
    );

    // Filtrer les épiceries sélectionnées pour ne garder que celles qui existent encore
    setSelectedMerchants((prev) => {
      const filtered = new Set<string>();
      prev.forEach((merchant) => {
        if (availableMerchants.has(merchant.toLowerCase())) {
          filtered.add(merchant);
        }
      });

      // Si des épiceries ont été retirées, mettre à jour le total
      if (filtered.size !== prev.size) {
        // Le total sera recalculé par AccordionEpiceries via onTotalChange
        if (filtered.size === 0) {
          setDynamicTotal(0);
          window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
        }
      }

      return filtered;
    });
  }, [dealsResults]);

  // Écouter les événements de mise à jour du garde-manger
  useEffect(() => {
    const handleGardeMangerUpdate = () => {
      // Rafraîchir la liste d'épicerie quand un item est ajouté au garde-manger
      // (les items correspondants ont été supprimés automatiquement par l'API)
      fetchListe();
    };
    
    window.addEventListener("garde-manger-updated", handleGardeMangerUpdate);
    return () => {
      window.removeEventListener("garde-manger-updated", handleGardeMangerUpdate);
    };
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

  const handleDeleteAllConfirm = async () => {
    try {
      const response = await fetch("/api/liste-epicerie", {
        method: "DELETE",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Liste d'épicerie vidée");
        fetchListe();
        setDeleteAllModal(false);
        // Réinitialiser les épiceries sélectionnées quand on efface tout
        setSelectedMerchants(new Set());
        setDynamicTotal(0);
        window.dispatchEvent(new CustomEvent("epicerie-total-updated", { detail: { total: 0 } }));
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la suppression");
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
      } else if (response.status === 429) {
        // Rate limit exceeded
        const errorData = await response.json().catch(() => ({}));
        const retryAfter = errorData.retryAfter || 60;
        console.warn(`Rate limit atteint. Réessayez dans ${retryAfter} secondes.`);
        // Ne pas afficher d'erreur à l'utilisateur, juste garder les résultats précédents
      } else if (response.status === 400) {
        // Erreur 400 : code postal non configuré ou liste vide
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || "Erreur lors du chargement des rabais";
        
        // Ne pas afficher d'erreur si c'est juste que le code postal n'est pas configuré ou la liste est vide
        // Ce sont des cas normaux, pas des erreurs critiques
        if (errorMessage.includes("Code postal non configuré") || errorMessage.includes("Liste d'épicerie vide")) {
          console.log("ℹ️ [ListeEpicerie] Rabais non disponibles:", errorMessage);
          setDealsResults(null);
        } else {
          console.warn("⚠️ [ListeEpicerie] Erreur lors du chargement des rabais:", errorMessage);
        }
      } else {
        // Autre erreur (500, etc.)
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || response.statusText;
        console.error("❌ [ListeEpicerie] Erreur lors du chargement des rabais:", response.status, errorMessage);
      }
    } catch (error) {
      console.error("❌ [ListeEpicerie] Erreur lors du chargement des rabais:", error);
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
    productName: string | null;
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
      productName: string | null;
    }> = [];
    
    // Parcourir tous les résultats de flyers
    for (const result of dealsResults.results) {
      for (const match of result.matches) {
        // Utiliser le matching strict pour éviter les faux positifs
        // Ex: "beurre" ne doit pas matcher "beurre d'arachide"
        if (matchIngredients(ingredientName, match.ingredient)) {
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
    
    let total = 0; // Total estimé (prix du produit complet - paquet/boîte/sac)
    let totalAvecRabais = 0; // Total avec rabais (prix du produit complet)
    let economie = 0; // Économie totale réalisée
    
    liste.lignes.forEach((ligne) => {
      // 🎯 LOGIQUE SAAS PRO: Toujours utiliser le prix du PRODUIT COMPLET
      // On ne peut pas acheter 2 tranches de bacon à l'épicerie, on doit acheter un paquet complet
      // Le prix affiché doit être le prix du produit complet qu'on va acheter
      // 
      // IMPORTANT: On ignore ligne.prixEstime car il peut contenir des prix ajustés de l'ancienne logique
      // On utilise toujours le fallback ou les deals pour obtenir le prix du produit complet
      
      // Toujours utiliser le meilleur deal ou le fallback (prix du produit complet)
      const meilleurDeal = getBestDealForIngredient(ligne.nom);
      let prixProduitComplet = 0;
      
      if (meilleurDeal.price !== null) {
        prixProduitComplet = meilleurDeal.price;
      } else {
        // Utiliser le fallback (prix du produit complet)
        const fallback = getFallbackPrice(ligne.nom);
        prixProduitComplet = fallback?.prix || 2.00;
      }
      
      // Utiliser le prix du produit complet (pas ajusté)
      // Exemple: 2 tranches de bacon → prix du paquet complet = 7.99$
      total += prixProduitComplet;
      
      // Pour le total avec rabais, utiliser le prix du produit complet du deal
      if (meilleurDeal.price !== null) {
        // Prix du produit complet en rabais
        totalAvecRabais += meilleurDeal.price;
        
        // Calculer l'économie basée sur les prix des produits complets
        // Si on a un fallback et qu'il est plus élevé que le deal, calculer l'économie
        const fallback = getFallbackPrice(ligne.nom);
        const prixEstime = fallback?.prix || prixProduitComplet;
        if (prixEstime > 0 && meilleurDeal.price < prixEstime) {
          const economieLigne = prixEstime - meilleurDeal.price;
          economie += economieLigne;
        }
      } else {
        // Si pas de deal, utiliser le prix estimé du produit complet
        totalAvecRabais += prixProduitComplet;
      }
    });
    
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
    <div className="space-y-4">
      {/* 🛒 CONTENEUR 1: Liste d'épicerie */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 sm:flex-nowrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Liste d'épicerie
              </h2>
              {liste && liste.lignes.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  {liste.lignes.length} {liste.lignes.length > 1 ? "items" : "item"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {liste && liste.lignes.length > 0 && (
              <Button
                onClick={() => setDeleteAllModal(true)}
                variant="danger"
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <Trash className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                <span className="hidden sm:inline">Tout supprimer</span>
              </Button>
            )}
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              variant="primary"
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          </div>
        </div>

        {liste && liste.lignes.length > 0 && (() => {
          const { total, totalAvecRabais, economie } = calculerTotal();
          const hasDeals = dealsResults && dealsResults.results.length > 0;
          
          // Le sous-total avec rabais n'est affiché que si des épiceries sont sélectionnées
          // Sinon, il reste à 0 par défaut
          const displayTotal = selectedMerchants.size > 0 ? dynamicTotal : 0;
          
          return (
            <div className="mb-4 space-y-2">
              {/* Sous-total avec rabais - Affiché seulement si des épiceries sont sélectionnées */}
              {selectedMerchants.size > 0 && (
                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {`Sous-total (${selectedMerchants.size} épicerie${selectedMerchants.size > 1 ? "s" : ""})`}
                    </span>
                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {displayTotal.toFixed(2)}$
                    </span>
                  </div>
                  {hasDeals && total > 0 && total > displayTotal && (
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Prix original:</span>
                      <span className="line-through">{total.toFixed(2)}$</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Économie totale - Box verte */}
              {hasDeals && economie > 0.01 && (
                <div className="p-5 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/40 dark:to-green-900/30 rounded-xl border-2 border-green-400 dark:border-green-600 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 dark:bg-green-600 rounded-lg">
                        <Tag className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                          Total des économies
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                          En achetant les meilleurs deals disponibles
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-extrabold text-green-700 dark:text-green-300">
                        -{economie.toFixed(2)}$
                      </span>
                      {total > 0 && total > totalAvecRabais && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          sur {total.toFixed(2)}$ de prix original
                        </span>
                      )}
                    </div>
                  </div>
                </div>
            )}
          </div>
        );
      })()}

        {/* Menu accordéon pour la liste d'items */}
        {liste && liste.lignes.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="w-full flex items-center justify-between p-3">
              <button
                onClick={() => setIsListExpanded(!isListExpanded)}
                className="flex-1 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors p-2 -m-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Items de la liste ({liste.lignes.length})
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isListExpanded ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {liste.lignes.length > 0 && (
                <motion.button
                  onClick={() => handleSortChange(sortBy === "default" ? "alphabetical" : "default")}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-2"
                  title={sortBy === "default" ? "Trier par ordre alphabétique" : "Trier par ordre d'ajout"}
                >
                  {sortBy === "default" ? (
                    <ArrowUpAZ className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <ArrowUpDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </motion.button>
              )}
            </div>

            <AnimatePresence>
              {isListExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {[...(liste?.lignes || [])]
                      .sort((a, b) => {
                        if (sortBy === "alphabetical") {
                          return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
                        }
                        return 0; // Ordre par défaut (ordre d'ajout)
                      })
                      .map((ligne, index) => {
              const deal = getBestDealForIngredient(ligne.nom);
              const hasDeal = deal.price !== null;
              const quantite = ligne.quantite || 1;
              
              // 🎯 LOGIQUE SAAS PRO: Toujours afficher le prix du PRODUIT COMPLET
              // On ne peut pas acheter des portions à l'épicerie, on doit acheter le produit complet
              // Exemple: 2 tranches de bacon → afficher 7.99$ (prix du paquet), pas 1.14$
              //
              // IMPORTANT: On ignore ligne.prixEstime car il peut contenir des prix ajustés de l'ancienne logique
              // On utilise toujours le fallback ou les deals pour obtenir le prix du produit complet
              
              // Prix estimé du produit complet (paquet/boîte/sac)
              let prixProduitComplet = 0;
              if (hasDeal && deal.price !== null) {
                prixProduitComplet = deal.price;
              } else {
                const fallback = getFallbackPrice(ligne.nom);
                prixProduitComplet = fallback?.prix || 0;
              }
              
              // Prix du deal du produit complet (pas ajusté)
              const prixDealComplet = hasDeal ? deal.price! : null;
              
              // Calculer l'économie basée sur les prix des produits complets
              const economieTotale = hasDeal && prixProduitComplet > 0 && prixDealComplet !== null
                ? Math.max(0, prixProduitComplet - prixDealComplet)
                : 0;
              
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
                  <div 
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
                    className="w-full flex items-center justify-between p-3 cursor-pointer group relative overflow-hidden rounded-lg transition-all duration-200 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-amber-50/80 dark:hover:from-orange-900/30 dark:hover:to-amber-900/20"
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
                        {hasDeal && prixDealComplet !== null ? (
                          <div className="flex items-center gap-2">
                            {prixProduitComplet > 0 && prixProduitComplet > prixDealComplet && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                {prixProduitComplet.toFixed(2)}$
                              </span>
                            )}
                            <div className="flex flex-col items-end">
                              <span className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400">
                                <DollarSign className="w-3 h-3" />
                                {prixDealComplet.toFixed(2)}$
                                <span className="text-xs font-normal text-gray-500">
                                  (prix du produit)
                                </span>
                              </span>
                              {deal.merchant && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  {deal.merchant}
                                </span>
                              )}
                            </div>
                            {economieTotale > 0 && (
                              <span className="text-xs text-green-500 font-medium">
                                (-{economieTotale.toFixed(2)}$)
                              </span>
                            )}
                          </div>
                        ) : (() => {
                          // 🎯 LOGIQUE SAAS PRO: Afficher le prix du PRODUIT COMPLET
                          // On ne peut pas acheter des portions à l'épicerie, on doit acheter le produit complet
                          //
                          // IMPORTANT: On ignore ligne.prixEstime et ingredientPrices car ils peuvent contenir
                          // des prix ajustés de l'ancienne logique. On utilise toujours le fallback.
                          
                          let prixProduitComplet = 0;
                          
                          // Utiliser le fallback (prix du produit complet)
                          const fallback = getFallbackPrice(ligne.nom);
                          if (fallback) {
                            prixProduitComplet = fallback.prix;
                          }
                          
                          if (prixProduitComplet > 0) {
                            return (
                              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <DollarSign className="w-3 h-3" />
                                <span className="text-sm">
                                  {prixProduitComplet.toFixed(2)}$
                                </span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                      {hasDeal && allDeals.length > 0 && (
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
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
                        >
                          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-orange-500 transition-colors" />
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
                  </div>

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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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

      {/* Modal de confirmation de suppression de toute la liste */}
      <Modal
        isOpen={deleteAllModal}
        onClose={() => setDeleteAllModal(false)}
        title="Tout supprimer"
        onConfirm={handleDeleteAllConfirm}
        variant="danger"
        confirmText="Tout supprimer"
        cancelText="Annuler"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer <strong>tous les items</strong> de votre liste d'épicerie ?
          <br />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Cette action est irréversible.
          </span>
        </p>
      </Modal>
        </motion.div>

      {/* 🏪 CONTENEUR 2: Épiceries avec rabais */}
      {liste && liste.lignes.length > 0 && dealsResults && dealsResults.results.length > 0 && !loadingDeals && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Store className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Épiceries avec rabais
            </h2>
          </div>

          <AccordionEpiceries
            dealsResults={dealsResults}
            listeItems={liste.lignes}
            selectedMerchants={selectedMerchants}
            onMerchantToggle={handleMerchantToggle}
            onTotalChange={handleTotalChange}
          />
        </motion.div>
      )}
    </div>
  );
}

