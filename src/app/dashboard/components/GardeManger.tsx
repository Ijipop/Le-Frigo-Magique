"use client";

import { useEffect, useState } from "react";

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
        const data = await response.json();
        setArticles(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des articles:", error);
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
        fetchArticles();
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;

    try {
      const response = await fetch(`/api/garde-manger/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchArticles();
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Garde-manger</h2>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Garde-manger</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-4 py-2 text-white font-semibold text-sm transition-all hover:scale-105"
        >
          {showForm ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Quantité"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
              <input
                type="text"
                placeholder="Unité (g, ml, etc.)"
                value={formData.unite}
                onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-4 py-2 text-white font-semibold transition-all hover:scale-105"
            >
              Ajouter
            </button>
          </div>
        </form>
      )}

      {articles.length === 0 ? (
        <p className="text-gray-600">Aucun article dans votre garde-manger.</p>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li
              key={article.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900">{article.nom}</span>
                <span className="ml-2 text-gray-600">
                  {article.quantite} {article.unite || ""}
                </span>
              </div>
              <button
                onClick={() => handleDelete(article.id)}
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

