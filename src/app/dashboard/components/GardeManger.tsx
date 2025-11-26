"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import Modal from "../../../components/ui/modal";
import Button from "../../../components/ui/button";

interface Article {
  id: string;
  nom: string;
  quantite: number;
  unite: string | null;
}

export default function GardeManger() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; articleId: string | null; articleNom: string }>({
    isOpen: false,
    articleId: null,
    articleNom: "",
  });
  const [formData, setFormData] = useState({
    nom: "",
    quantite: "",
    unite: "",
  });

  // Charger les articles
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch("/api/garde-manger");
      if (response.ok) {
        const result = await response.json();
        // Gérer la nouvelle structure de réponse { data: [...] } ou l'ancienne [...]
        const articlesData = result.data || result;
        setArticles(Array.isArray(articlesData) ? articlesData : []);
      } else {
        console.error("Erreur API:", response.status, response.statusText);
        // En cas d'erreur, initialiser avec un tableau vide
        setArticles([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles:", error);
      setArticles([]);
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
          unite: formData.unite || null,
        }),
      });

      if (response.ok) {
        setFormData({ nom: "", quantite: "", unite: "" });
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg dark:shadow-gray-900/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Garde-manger</h2>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant={showForm ? "secondary" : "primary"}
        >
          <Plus className="w-4 h-4 mr-1 inline" />
          {showForm ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Quantité"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                required
              />
              <input
                type="text"
                placeholder="Unité (g, ml, etc.)"
                value={formData.unite}
                onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
              />
            </div>
            <Button type="submit" className="w-full" size="md">
              <Plus className="w-4 h-4 mr-2 inline" />
              Ajouter l'article
            </Button>
          </div>
        </form>
      )}

      {articles.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">Aucun article dans votre garde-manger.</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li
              key={article.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">{article.nom}</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  {article.quantite} {article.unite || ""}
                </span>
              </div>
              <button
                onClick={() => handleDeleteClick(article.id, article.nom)}
                className="p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

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
    </div>
  );
}

