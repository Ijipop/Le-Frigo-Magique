"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Search, ChevronDown, ChevronUp, Grid3x3, List, SortAsc, SortDesc } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "../../../components/ui/modal";
import Button from "../../../components/ui/button";

interface Article {
  id: string;
  nom: string;
  quantite: number;
  unite: string | null;
}

type SortOption = "alphabetical" | "quantity" | "recent";
type ViewMode = "list" | "compact";

export default function GardeManger() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; articleId: string | null; articleNom: string }>({
    isOpen: false,
    articleId: null,
    articleNom: "",
  });
  
  // États pour la gestion de grandes listes
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [sortAscending, setSortAscending] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [displayLimit, setDisplayLimit] = useState(6); // Afficher 6 items par défaut (raisonnable pour mobile et desktop)
  // Unités prédéfinies selon le type
  const unitesParType = {
    quantite: ["unité", "pièce", "tranche", "portion", "boîte", "paquet"],
    poids: ["g", "kg", "oz", "lb"],
    volume: ["ml", "L", "cl", "c. à soupe", "c. à café", "tasse"],
  };

  const [formData, setFormData] = useState({
    nom: "",
    quantite: "",
    typeMesure: "quantite" as "quantite" | "poids" | "volume",
    unite: unitesParType.quantite[0], // Unité par défaut
  });

  // Charger les articles
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/garde-manger", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      
      if (response.ok) {
        const result = await response.json();
        // Gérer la nouvelle structure de réponse { data: [...] } ou l'ancienne [...]
        const articlesData = result.data || result;
        const articlesArray = Array.isArray(articlesData) ? articlesData : [];
        // Trier automatiquement par ordre alphabétique
        const sorted = [...articlesArray].sort((a, b) => 
          a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
        );
        setArticles(sorted);
      } else {
        const errorText = await response.text();
        console.error("Erreur API:", response.status, response.statusText, errorText);
        // En cas d'erreur, initialiser avec un tableau vide
        setArticles([]);
        if (response.status === 404) {
          console.warn("Route API /api/garde-manger non trouvée. Vérifiez que le serveur est démarré.");
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles:", error);
      setArticles([]);
      // Ne pas afficher d'erreur toast pour éviter de spammer l'utilisateur
      // L'utilisateur verra simplement une liste vide
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/garde-manger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          quantite: parseFloat(formData.quantite),
          unite: formData.unite || unitesParType[formData.typeMesure][0],
        }),
      });

      if (response.ok) {
        setFormData({ nom: "", quantite: "", typeMesure: "quantite", unite: unitesParType.quantite[0] });
        setShowForm(false);
        toast.success("Article ajouté avec succès !");
        fetchArticles();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error("Une erreur est survenue");
    }
  };

  const handleDeleteClick = (id: string, nom: string) => {
    setDeleteModal({ isOpen: true, articleId: id, articleNom: nom });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.articleId) return;

    try {
      const response = await fetch(`/api/garde-manger/${deleteModal.articleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Article supprimé avec succès !");
        fetchArticles();
        setDeleteModal({ isOpen: false, articleId: null, articleNom: "" });
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Une erreur est survenue");
    }
  };

  // Filtrer et trier les articles
  const filteredAndSortedArticles = useMemo(() => {
    let filtered = articles;

    // Filtrage par recherche
    if (searchTerm.trim()) {
      filtered = filtered.filter(article =>
        article.nom.toLowerCase().includes(searchTerm.toLowerCase().trim())
      );
    }

    // Tri
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "alphabetical":
          comparison = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
          break;
        case "quantity":
          comparison = a.quantite - b.quantite;
          break;
        case "recent":
          // Pour l'instant, on trie par ID (les plus récents ont des IDs plus grands)
          comparison = a.id.localeCompare(b.id);
          break;
      }
      
      return sortAscending ? comparison : -comparison;
    });

    return sorted;
  }, [articles, searchTerm, sortBy, sortAscending]);

  // Articles à afficher (avec limite)
  const displayedArticles = filteredAndSortedArticles.slice(0, displayLimit);
  const hasMore = filteredAndSortedArticles.length > displayLimit;
  const totalCount = articles.length;
  const filteredCount = filteredAndSortedArticles.length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Garde-manger</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
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
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Garde-manger</h2>
            {totalCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredCount === totalCount 
                  ? `${totalCount} article${totalCount > 1 ? 's' : ''}`
                  : `${filteredCount} sur ${totalCount} article${totalCount > 1 ? 's' : ''}`
                }
              </p>
            )}
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            variant={showForm ? "secondary" : "primary"}
          >
            <Plus className="w-4 h-4 mr-1 inline" />
            {showForm ? "Annuler" : "Ajouter"}
          </Button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden"
          >
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              required
            />
            
            {/* Sélecteur de type de mesure */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const defaultUnite = unitesParType.quantite[0];
                  setFormData({ ...formData, typeMesure: "quantite", unite: defaultUnite });
                }}
                className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  formData.typeMesure === "quantite"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Quantité
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultUnite = unitesParType.poids[0];
                  setFormData({ ...formData, typeMesure: "poids", unite: defaultUnite });
                }}
                className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  formData.typeMesure === "poids"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Poids
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultUnite = unitesParType.volume[0];
                  setFormData({ ...formData, typeMesure: "volume", unite: defaultUnite });
                }}
                className={`flex-1 px-3 py-2 rounded-lg border transition-colors text-sm font-medium ${
                  formData.typeMesure === "volume"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                Volume
              </button>
            </div>

            {/* Champ quantité et unité */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder={formData.typeMesure === "quantite" ? "Quantité" : formData.typeMesure === "poids" ? "Poids" : "Volume"}
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                required
              />
              <select
                value={formData.unite || unitesParType[formData.typeMesure][0]}
                onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              >
                {unitesParType[formData.typeMesure].map((unite) => (
                  <option key={unite} value={unite}>
                    {unite}
                  </option>
                ))}
              </select>
            </div>
            
            <Button type="submit" className="w-full" size="md">
              <Plus className="w-4 h-4 mr-2 inline" />
              Ajouter l'article
            </Button>
          </div>
        </motion.form>
        )}
      </AnimatePresence>

      {/* Barre de recherche et contrôles */}
      {articles.length > 0 && (
        <div className="mb-4 space-y-3">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDisplayLimit(6); // Réinitialiser la limite lors d'une nouvelle recherche
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
          </div>

          {/* Contrôles de tri et vue */}
          <div className="flex items-center justify-between gap-2">
            {/* Sélecteur de tri */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              >
                <option value="alphabetical">Alphabétique</option>
                <option value="quantity">Quantité</option>
                <option value="recent">Récent</option>
              </select>
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title={sortAscending ? "Tri croissant" : "Tri décroissant"}
              >
                {sortAscending ? (
                  <SortAsc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ) : (
                  <SortDesc className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>

            {/* Toggle vue compacte/liste */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-white dark:bg-gray-600 text-orange-500"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
                title="Vue liste"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("compact")}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "compact"
                    ? "bg-white dark:bg-gray-600 text-orange-500"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
                title="Vue compacte"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {articles.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-gray-600 dark:text-gray-300"
          >
            Aucun article dans votre garde-manger.
          </motion.p>
        ) : filteredAndSortedArticles.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-600 dark:text-gray-300 py-8"
          >
            Aucun article ne correspond à votre recherche.
          </motion.p>
        ) : (
          <>
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className={viewMode === "compact" 
                ? "grid grid-cols-2 gap-2" 
                : "space-y-2"
              }
            >
              <AnimatePresence>
                {displayedArticles.map((article, index) => (
                <motion.li
                  key={article.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: viewMode === "list" ? 4 : 0 }}
                  className={`flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    viewMode === "compact" 
                      ? "p-2 flex-col items-start gap-1" 
                      : "p-3"
                  }`}
                >
                  <div className={`flex-1 ${viewMode === "compact" ? "w-full" : ""}`}>
                    <div className={`font-medium text-gray-900 dark:text-white ${viewMode === "compact" ? "text-sm truncate" : ""}`}>
                      {article.nom}
                    </div>
                    <div className={`text-gray-600 dark:text-gray-300 ${viewMode === "compact" ? "text-xs" : "ml-2 inline"}`}>
                      {article.quantite} {article.unite || ""}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteClick(article.id, article.nom)}
                    className={`rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${
                      viewMode === "compact" ? "p-1 self-end" : "p-2"
                    }`}
                    aria-label="Supprimer"
                  >
                    <Trash2 className={viewMode === "compact" ? "w-3 h-3" : "w-4 h-4"} />
                  </motion.button>
                </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>

            {/* Boutons de navigation */}
            {filteredAndSortedArticles.length > 6 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-2 pt-4"
              >
                {hasMore ? (
                  <>
                    <Button
                      onClick={() => {
                        // Charger 10 items supplémentaires à chaque fois
                        setDisplayLimit(Math.min(displayLimit + 10, filteredAndSortedArticles.length));
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Voir plus ({filteredAndSortedArticles.length - displayLimit} restant{filteredAndSortedArticles.length - displayLimit > 1 ? 's' : ''})
                    </Button>
                    <Button
                      onClick={() => {
                        setDisplayLimit(filteredAndSortedArticles.length);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      Voir tout ({filteredAndSortedArticles.length})
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setDisplayLimit(6); // Revenir à l'affichage initial
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Voir moins
                  </Button>
                )}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, articleId: null, articleNom: "" })}
        title="Supprimer l'article"
        onConfirm={handleDeleteConfirm}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      >
        <p className="text-gray-600 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer <strong>{deleteModal.articleNom}</strong> ?
          Cette action est irréversible.
        </p>
      </Modal>
    </motion.div>
  );
}

