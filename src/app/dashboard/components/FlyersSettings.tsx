"use client";

import { useState, useEffect } from "react";
import { MapPin, Save, ShoppingBag, Search, DollarSign, Loader2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";

interface DealMatch {
  ingredient: string;
  matchedItem: {
    id: string;
    name: string;
    current_price: number | null;
    original_price: number | null;
    image_url: string | null;
  };
  matchScore: number;
  savings: number | null;
  estimatedOriginalPrice?: number;
  isEstimated?: boolean;
}

interface FlyerResult {
  flyer: {
    id: number;
    merchant: string;
    title: string;
    thumbnail_url: string | null;
  };
  matches: DealMatch[];
  totalSavings: number;
}

export default function FlyersSettings() {
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dealsResults, setDealsResults] = useState<{
    results: FlyerResult[];
    totalMatches: number;
    ingredientsCount: number;
  } | null>(null);
  const [expandedFlyers, setExpandedFlyers] = useState<Set<number>>(new Set());

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

  const handleSearchDeals = async () => {
    try {
      setSearching(true);
      setDealsResults(null);

      const response = await fetch("/api/flyers/search-deals");
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Erreur lors de la recherche");
        return;
      }

      const data = await response.json();
      
      // Log pour déboguer les prix estimés
      if (data.results && data.results.length > 0) {
        const sampleMatch = data.results[0]?.matches?.[0];
        console.log("🔍 [FLYERS-SETTINGS] Exemple de match reçu:", {
          hasEstimated: sampleMatch?.isEstimated,
          estimatedPrice: sampleMatch?.estimatedOriginalPrice,
          originalPrice: sampleMatch?.matchedItem?.original_price,
          currentPrice: sampleMatch?.matchedItem?.current_price,
          itemName: sampleMatch?.matchedItem?.name,
        });
      }
      
      if (data.results && data.results.length > 0) {
        setDealsResults({
          results: data.results,
          totalMatches: data.totalMatches,
          ingredientsCount: data.ingredientsCount,
        });
        toast.success(`${data.totalMatches} rabais trouvés !`);
      } else {
        toast.info("Aucun rabais trouvé pour vos ingrédients");
        setDealsResults({
          results: [],
          totalMatches: 0,
          ingredientsCount: data.ingredientsCount || 0,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setSearching(false);
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

      <div className="space-y-4">
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

        <Button
          onClick={handleSearchDeals}
          disabled={searching || !postalCode}
          variant="primary"
          className="w-full"
          size="sm"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche en cours...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Chercher les rabais
            </>
          )}
        </Button>

        {/* Résultats des rabais */}
        <AnimatePresence>
          {dealsResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 space-y-4"
            >
              {dealsResults.results.length === 0 ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center text-sm text-gray-600 dark:text-gray-400">
                  Aucun rabais trouvé pour vos {dealsResults.ingredientsCount} ingrédient{dealsResults.ingredientsCount > 1 ? "s" : ""}
                </div>
              ) : (
                <>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {dealsResults.totalMatches} rabais trouvés
                      </span>
                      <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
                        {dealsResults.results.reduce((sum, r) => sum + r.totalSavings, 0).toFixed(2)}$
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Économies potentielles totales
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {dealsResults.results.map((result, index) => {
                      const isExpanded = expandedFlyers.has(result.flyer.id);
                      
                      return (
                        <motion.div
                          key={result.flyer.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
                        >
                          {/* En-tête cliquable du flyer */}
                          <button
                            onClick={() => {
                              setExpandedFlyers(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(result.flyer.id)) {
                                  newSet.delete(result.flyer.id);
                                } else {
                                  newSet.add(result.flyer.id);
                                }
                                return newSet;
                              });
                            }}
                            className="w-full p-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                          >
                            {result.flyer.thumbnail_url && (
                              <img
                                src={result.flyer.thumbnail_url}
                                alt={result.flyer.merchant}
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1 text-left">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {result.flyer.merchant}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {result.matches.length} rabais • Économies: {result.totalSavings.toFixed(2)}$
                              </p>
                            </div>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </motion.div>
                          </button>

                          {/* Liste des rabais (déroulante) */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 pt-0 space-y-2">
                                  {result.matches.map((match, matchIndex) => (
                                    <motion.div
                                      key={`${match.ingredient}-${match.matchedItem.id}-${matchIndex}`}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: matchIndex * 0.05 }}
                                      className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                                    >
                                      {match.matchedItem.image_url && (
                                        <img
                                          src={match.matchedItem.image_url}
                                          alt={match.matchedItem.name}
                                          className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                          }}
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                          {match.matchedItem.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Pour: {match.ingredient}
                                        </p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        {(() => {
                                          const hasOriginalPrice = !!match.matchedItem.original_price;
                                          const hasEstimatedPrice = !!match.estimatedOriginalPrice;
                                          const hasCurrentPrice = !!match.matchedItem.current_price;
                                          
                                          // Log pour déboguer (seulement pour les premiers matches)
                                          if (result.matches.indexOf(match) < 2) {
                                            console.log(`🔍 [FLYERS-SETTINGS] Match "${match.matchedItem.name}":`, {
                                              hasOriginalPrice,
                                              hasEstimatedPrice,
                                              hasCurrentPrice,
                                              originalPrice: match.matchedItem.original_price,
                                              estimatedPrice: match.estimatedOriginalPrice,
                                              currentPrice: match.matchedItem.current_price,
                                              isEstimated: match.isEstimated,
                                            });
                                          }
                                          
                                          if ((hasOriginalPrice || hasEstimatedPrice) && hasCurrentPrice) {
                                            const priceToShow: number = hasEstimatedPrice 
                                              ? (match.estimatedOriginalPrice ?? 0)
                                              : (typeof match.matchedItem.original_price === 'number' 
                                                  ? match.matchedItem.original_price 
                                                  : 0);
                                            return (
                                              <div className="flex flex-col items-end gap-1">
                                                <div className="flex flex-col items-end">
                                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {match.isEstimated ? "Prix rég. (approx.)" : "Prix rég."}
                                                  </span>
                                                  <span className={`text-xs ${match.isEstimated ? 'text-gray-500 italic' : 'text-gray-400'} line-through`}>
                                                    {priceToShow.toFixed(2)}$
                                                  </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                  <span className="text-xs text-orange-500 font-medium">
                                                    {match.isEstimated ? "Rabais (approx.)" : "Rabais"}
                                                  </span>
                                                  <span className="text-sm font-bold text-orange-500">
                                                    {match.matchedItem.current_price !== null && typeof match.matchedItem.current_price === 'number'
                                                      ? match.matchedItem.current_price.toFixed(2)
                                                      : '0.00'}$
                                                  </span>
                                                </div>
                                                {match.savings && match.savings > 0 && (
                                                  <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded">
                                                    <Tag className="w-3 h-3 text-green-500" />
                                                    <span className="text-xs font-medium text-green-500">
                                                      Économie: {match.savings.toFixed(2)}$
                                                      {match.isEstimated && " (approx.)"}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          } else if (hasCurrentPrice && match.matchedItem.current_price !== null) {
                                            return (
                                              <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Prix</span>
                                                <span className="text-sm font-bold text-orange-500">
                                                  {typeof match.matchedItem.current_price === 'number'
                                                    ? match.matchedItem.current_price.toFixed(2)
                                                    : '0.00'}$
                                                </span>
                                              </div>
                                            );
                                          } else if (hasOriginalPrice && match.matchedItem.original_price !== null) {
                                            return (
                                              <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Prix rég.</span>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                  {typeof match.matchedItem.original_price === 'number'
                                                    ? match.matchedItem.original_price.toFixed(2)
                                                    : '0.00'}$
                                                </span>
                                              </div>
                                            );
                                          } else {
                                            return <span className="text-xs text-gray-400">Prix non disponible</span>;
                                          }
                                        })()}
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

