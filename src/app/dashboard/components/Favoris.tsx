"use client";

import { useState, useEffect } from "react";
import { Heart, ExternalLink, Loader2, Trash2, ChefHat, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface RecetteFavorite {
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

export default function Favoris() {
  const [favorites, setFavorites] = useState<RecetteFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [addingToWeek, setAddingToWeek] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFavorites();
    
    // Écouter les événements de mise à jour des favoris
    const handleFavoritesUpdate = () => {
      loadFavorites();
    };
    
    window.addEventListener("favoris-updated", handleFavoritesUpdate);
    return () => {
      window.removeEventListener("favoris-updated", handleFavoritesUpdate);
    };
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/recettes-favorites");
      if (response.ok) {
        const result = await response.json();
        setFavorites(result.data || []);
      } else {
        toast.error("Erreur lors du chargement des favoris");
      }
    } catch (error) {
      console.error("Erreur lors du chargement des favoris:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWeek = async (favorite: RecetteFavorite) => {
    if (addingToWeek.has(favorite.url)) {
      return;
    }

    try {
      setAddingToWeek(new Set([...addingToWeek, favorite.url]));

      const response = await fetch("/api/recettes-semaine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: favorite.titre,
          url: favorite.url,
          image: favorite.image,
          snippet: favorite.snippet,
          source: favorite.source,
          estimatedCost: favorite.estimatedCost,
          servings: favorite.servings,
        }),
      });

      if (response.ok) {
        toast.success(`"${favorite.titre}" ajoutée aux recettes de la semaine !`);
        window.dispatchEvent(new CustomEvent("recettes-semaine-updated"));
      } else {
        const error = await response.json();
        if (response.status === 409) {
          toast.info("Cette recette est déjà dans vos recettes de la semaine");
        } else {
          toast.error(error.error || "Erreur lors de l'ajout");
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setAddingToWeek(new Set([...addingToWeek].filter(url => url !== favorite.url)));
    }
  };

  const handleDelete = async (favorite: RecetteFavorite) => {
    if (deleting.has(favorite.id)) {
      return;
    }

    try {
      setDeleting(new Set([...deleting, favorite.id]));
      const response = await fetch(`/api/recettes-favorites?url=${encodeURIComponent(favorite.url)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`"${favorite.titre}" retirée des favoris`);
        setFavorites(favorites.filter(f => f.id !== favorite.id));
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setDeleting(new Set([...deleting].filter(id => id !== favorite.id)));
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-400 to-red-500">
            <Heart className="w-5 h-5 text-white fill-current" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Mes Favoris
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </motion.div>
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
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-2 rounded-lg bg-gradient-to-br from-red-400 to-red-500"
          >
            <Heart className="w-5 h-5 text-white fill-current" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Mes Favoris
          </h2>
        </div>
        {favorites.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {favorites.length} recette{favorites.length > 1 ? "s" : ""}
          </span>
        )}
      </motion.div>

      {favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Aucune recette favorite pour le moment
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Cliquez sur le cœur <Heart className="w-4 h-4 inline text-red-400" /> sur une recette pour l'ajouter à vos favoris
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto overflow-x-hidden pr-3 pl-1">
          <AnimatePresence>
            {favorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 group"
              >
                {/* Miniature */}
                <div className="flex-shrink-0">
                  {favorite.image ? (
                    <img
                      src={favorite.image}
                      alt={favorite.titre}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer"
                      onClick={() => window.open(favorite.url, '_blank')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 cursor-pointer">
                              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                              </svg>
                            </div>
                          `;
                        }
                      }}
                    />
                  ) : (
                    <div 
                      className="w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 dark:from-gray-600 dark:to-gray-700 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600 cursor-pointer"
                      onClick={() => window.open(favorite.url, '_blank')}
                    >
                      <ChefHat className="w-8 h-8 text-red-400 dark:text-red-500" />
                    </div>
                  )}
                </div>
                
                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <h4 
                    className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-red-500 transition-colors cursor-pointer"
                    onClick={() => window.open(favorite.url, '_blank')}
                  >
                    {favorite.titre}
                  </h4>
                  {favorite.snippet && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {favorite.snippet}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {favorite.source && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {favorite.source}
                        </span>
                      )}
                      {favorite.estimatedCost && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          ~{favorite.estimatedCost.toFixed(2)}$
                        </span>
                      )}
                      {favorite.servings && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {favorite.servings} portion{favorite.servings > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWeek(favorite);
                        }}
                        disabled={addingToWeek.has(favorite.url)}
                        className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        title="Ajouter aux recettes de la semaine"
                      >
                        {addingToWeek.has(favorite.url) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </motion.button>
                      <a
                        href={favorite.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Voir la recette"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(favorite);
                        }}
                        disabled={deleting.has(favorite.id)}
                        className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title="Retirer des favoris"
                      >
                        {deleting.has(favorite.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

