"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Store, Tag, DollarSign } from "lucide-react";
import { matchIngredients } from "../../../../lib/utils/ingredientMatcher";
import { getFallbackPrice } from "../../../../lib/utils/priceFallback";

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
    title?: string;
    thumbnail_url?: string | null;
  };
  matches: DealMatch[];
  totalSavings?: number;
}

interface AccordionEpiceriesProps {
  dealsResults: { results: FlyerResult[] } | null;
  listeItems: Array<{
    id: string;
    nom: string;
    quantite: number;
    unite: string | null;
    prixEstime: number | null;
  }>;
  selectedMerchants: Set<string>;
  onMerchantToggle: (merchant: string) => void;
  onTotalChange: (total: number) => void;
}

export default function AccordionEpiceries({
  dealsResults,
  listeItems,
  selectedMerchants,
  onMerchantToggle,
  onTotalChange,
}: AccordionEpiceriesProps) {
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(new Set());

  if (!dealsResults || dealsResults.results.length === 0) {
    return null;
  }

  // Toggle l'expansion d'une épicerie
  const toggleExpanded = (merchant: string) => {
    setExpandedMerchants((prev) => {
      const next = new Set(prev);
      if (next.has(merchant)) {
        next.delete(merchant);
      } else {
        next.add(merchant);
      }
      return next;
    });
  };

  // Calculer le total pour une épicerie spécifique
  const calculateMerchantTotal = (merchant: string): number => {
    const merchantResult = dealsResults.results.find(
      (r) => r.flyer.merchant.toLowerCase() === merchant.toLowerCase()
    );

    if (!merchantResult) return 0;

    let total = 0;

    // Pour chaque ingrédient de la liste, trouver le meilleur prix dans cette épicerie
    listeItems.forEach((item) => {
      const match = merchantResult.matches.find((m) =>
        matchIngredients(m.ingredient, item.nom)
      );

      if (match && match.matchedItem) {
        // Vérifier si current_price existe et est valide
        const currentPrice = match.matchedItem.current_price;
        if (currentPrice !== null && currentPrice !== undefined && typeof currentPrice === 'number' && !isNaN(currentPrice) && currentPrice > 0) {
          // Utiliser le prix en rabais si disponible
          total += currentPrice;
        } else {
          // 🎯 LOGIQUE SAAS PRO: Ignorer item.prixEstime, utiliser le fallback (prix du produit complet)
          const fallback = getFallbackPrice(item.nom);
          total += fallback?.prix || 2.00;
        }
      } else {
        // 🎯 LOGIQUE SAAS PRO: Ignorer item.prixEstime, utiliser le fallback (prix du produit complet)
        const fallback = getFallbackPrice(item.nom);
        total += fallback?.prix || 2.00;
      }
    });

    return total;
  };

  // Calculer le total global basé sur les épiceries sélectionnées
  const calculateGlobalTotal = (): number => {
    // Si aucune épicerie sélectionnée, retourner 0
    if (selectedMerchants.size === 0) {
      return 0;
    }

    // Pour chaque ingrédient, trouver le meilleur prix parmi les épiceries sélectionnées
    let total = 0;

    listeItems.forEach((item) => {
      let bestPrice: number | null = null;

      // Chercher le meilleur prix parmi les épiceries sélectionnées
      selectedMerchants.forEach((merchant) => {
        const merchantResult = dealsResults.results.find(
          (r) => r.flyer.merchant.toLowerCase() === merchant.toLowerCase()
        );

        if (merchantResult) {
          const match = merchantResult.matches.find((m) =>
            matchIngredients(m.ingredient, item.nom)
          );

          if (match && match.matchedItem.current_price !== null) {
            if (bestPrice === null || match.matchedItem.current_price < bestPrice) {
              bestPrice = match.matchedItem.current_price;
            }
          }
        }
      });

      // 🎯 LOGIQUE SAAS PRO: Utiliser le meilleur prix trouvé, ou le fallback (prix du produit complet)
      // Ignorer item.prixEstime car il peut contenir des prix ajustés
      const fallback = getFallbackPrice(item.nom);
      total += bestPrice !== null ? bestPrice : (fallback?.prix || 2.00);
    });

    return total;
  };

  // Mettre à jour le total quand les sélections changent
  useEffect(() => {
    const total = calculateGlobalTotal();
    onTotalChange(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMerchants, dealsResults?.results.length, listeItems.length]);

  return (
    <div className="space-y-3">
      {/* Compteur d'épiceries sélectionnées */}
      {selectedMerchants.size > 0 && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            ✓ {selectedMerchants.size} épicerie{selectedMerchants.size > 1 ? "s" : ""} sélectionnée{selectedMerchants.size > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {dealsResults.results
        .map((result) => {
          const merchant = result.flyer.merchant;
          const merchantTotal = calculateMerchantTotal(merchant);
          return { result, merchant, merchantTotal };
        })
        .sort((a, b) => a.merchantTotal - b.merchantTotal) // Trier par prix croissant (moins cher d'abord)
        .map(({ result, merchant, merchantTotal }) => {
          const isExpanded = expandedMerchants.has(merchant);
          const isSelected = selectedMerchants.has(merchant);

        // Créer une liste consolidée des ingrédients pour cette épicerie
        const consolidatedItems = listeItems.map((item) => {
          // Chercher le match pour cet ingrédient
          const match = result.matches.find((m) =>
            matchIngredients(m.ingredient, item.nom)
          );

          // 🎯 CORRECTION: Utiliser le prix du deal si disponible, sinon le prix estimé
          // Le prix du deal est le prix réel du produit en rabais
          let hasDeal = false;
          let dealPrice: number | null = null;
          let originalPrice: number | null = null;

          if (match && match.matchedItem) {
            // Vérifier si current_price existe et est valide
            const currentPrice = match.matchedItem.current_price;
            if (currentPrice !== null && currentPrice !== undefined && typeof currentPrice === 'number' && !isNaN(currentPrice) && currentPrice > 0) {
              hasDeal = true;
              dealPrice = currentPrice;
              
              // Récupérer le prix original si disponible
              if (match.matchedItem.original_price !== null && match.matchedItem.original_price !== undefined) {
                const orig = match.matchedItem.original_price;
                if (typeof orig === 'number') {
                  originalPrice = orig;
                } else if (typeof orig === 'string') {
                  originalPrice = parseFloat(orig);
                }
              } else if (match.estimatedOriginalPrice) {
                originalPrice = match.estimatedOriginalPrice;
              }
            }
          }
          
          // Si on a un deal, utiliser son prix. Sinon, utiliser le prix estimé de la liste ou le prix moyen du Québec
          const fallback = getFallbackPrice(item.nom);
          const price = dealPrice !== null && dealPrice > 0 ? dealPrice : (item.prixEstime || fallback?.prix || 4.50);
          
          // Le prix original est soit le original_price du deal, soit null
          const displayOriginalPrice = originalPrice !== null && originalPrice > 0 ? originalPrice : null;

          return {
            ...item,
            match,
            price,
            originalPrice: displayOriginalPrice,
            hasDeal,
          };
        });

        return (
          <motion.div
            key={result.flyer.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
          >
            {/* Header de l'accordéon */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => toggleExpanded(merchant)}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Checkbox pour sélectionner l'épicerie */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMerchantToggle(merchant);
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-gray-300 dark:border-gray-600 hover:border-orange-400"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {merchant}
                    </h4>
                    {result.totalSavings !== null && result.totalSavings !== undefined && result.totalSavings > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        -{result.totalSavings.toFixed(2)}$
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {merchantTotal.toFixed(2)}$ CAD
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {(() => {
                        // Compter uniquement les rabais réels (ceux qui ont un current_price valide)
                        const realDealsCount = consolidatedItems.filter(item => item.hasDeal).length;
                        return realDealsCount;
                      })()} rabais disponible{(() => {
                        const realDealsCount = consolidatedItems.filter(item => item.hasDeal).length;
                        return realDealsCount > 1 ? "s" : "";
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isExpanded ? "transform rotate-180" : ""
                }`}
              />
            </div>

            {/* Contenu de l'accordéon */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-2">
                      {consolidatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {item.nom}
                              </span>
                              {item.hasDeal && (
                                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  En rabais
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {item.quantite} {item.unite || "unité"}
                            </span>
                            {/* Afficher le nom du produit si disponible dans le deal */}
                            {item.match?.matchedItem.name && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                                {item.match.matchedItem.name}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {item.hasDeal && item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                                {item.originalPrice.toFixed(2)}$
                              </span>
                            )}
                            <span
                              className={`font-semibold text-lg ${
                                item.hasDeal
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {item.price.toFixed(2)}$
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

