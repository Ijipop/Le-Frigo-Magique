"use client";

import { useState } from "react";
import { ShoppingCart, Plus, X, Search } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/button";
import Modal from "../../../components/ui/modal";

interface CategoryItem {
  id: string;
  nom: string;
  categorie: string;
}

const CATEGORIES = [
  { id: "viande", nom: "Viande", icon: "🥩" },
  { id: "fruits", nom: "Fruits", icon: "🍎" },
  { id: "legumes", nom: "Légumes", icon: "🥕" },
  { id: "produits-laitiers", nom: "Produits laitiers", icon: "🥛" },
  { id: "epicerie", nom: "Épicerie", icon: "🍝" },
  { id: "epices", nom: "Épices", icon: "🌶️" },
  { id: "boissons", nom: "Boissons", icon: "🥤" },
  { id: "autres", nom: "Autres", icon: "📦" },
];

const POPULAR_ITEMS: Record<string, CategoryItem[]> = {
  viande: [
    { id: "1", nom: "Poulet", categorie: "viande" },
    { id: "2", nom: "Bœuf haché", categorie: "viande" },
    { id: "3", nom: "Porc", categorie: "viande" },
    { id: "4", nom: "Saumon", categorie: "viande" },
    { id: "5", nom: "Dinde", categorie: "viande" },
    { id: "6", nom: "Bacon", categorie: "viande" },
    { id: "7", nom: "Steak", categorie: "viande" },
    { id: "8", nom: "Côtelettes", categorie: "viande" },
    { id: "9", nom: "Thon", categorie: "viande" },
    { id: "10", nom: "Crevettes", categorie: "viande" },
  ],
  fruits: [
    { id: "11", nom: "Pommes", categorie: "fruits" },
    { id: "12", nom: "Bananes", categorie: "fruits" },
    { id: "13", nom: "Oranges", categorie: "fruits" },
    { id: "14", nom: "Fraises", categorie: "fruits" },
    { id: "15", nom: "Raisins", categorie: "fruits" },
    { id: "16", nom: "Avocats", categorie: "fruits" },
    { id: "17", nom: "Myrtilles", categorie: "fruits" },
    { id: "18", nom: "Mangues", categorie: "fruits" },
    { id: "19", nom: "Ananas", categorie: "fruits" },
    { id: "20", nom: "Citrons", categorie: "fruits" },
  ],
  legumes: [
    { id: "21", nom: "Carottes", categorie: "legumes" },
    { id: "22", nom: "Brocoli", categorie: "legumes" },
    { id: "23", nom: "Tomates", categorie: "legumes" },
    { id: "24", nom: "Oignons", categorie: "legumes" },
    { id: "25", nom: "Ail", categorie: "legumes" },
    { id: "26", nom: "Poivrons", categorie: "legumes" },
    { id: "27", nom: "Courgettes", categorie: "legumes" },
    { id: "28", nom: "Épinards", categorie: "legumes" },
    { id: "29", nom: "Champignons", categorie: "legumes" },
    { id: "30", nom: "Laitue", categorie: "legumes" },
    { id: "31", nom: "Concombres", categorie: "legumes" },
    { id: "32", nom: "Pommes de terre", categorie: "legumes" },
  ],
  "produits-laitiers": [
    { id: "33", nom: "Lait", categorie: "produits-laitiers" },
    { id: "34", nom: "Fromage", categorie: "produits-laitiers" },
    { id: "35", nom: "Yogourt", categorie: "produits-laitiers" },
    { id: "36", nom: "Beurre", categorie: "produits-laitiers" },
    { id: "37", nom: "Œufs", categorie: "produits-laitiers" },
    { id: "38", nom: "Crème", categorie: "produits-laitiers" },
    { id: "39", nom: "Fromage cottage", categorie: "produits-laitiers" },
    { id: "40", nom: "Mozzarella", categorie: "produits-laitiers" },
  ],
  epicerie: [
    { id: "41", nom: "Pâtes", categorie: "epicerie" },
    { id: "42", nom: "Riz", categorie: "epicerie" },
    { id: "43", nom: "Pain", categorie: "epicerie" },
    { id: "44", nom: "Huile d'olive", categorie: "epicerie" },
    { id: "45", nom: "Farine", categorie: "epicerie" },
    { id: "46", nom: "Sucre", categorie: "epicerie" },
    { id: "47", nom: "Haricots", categorie: "epicerie" },
    { id: "48", nom: "Lentilles", categorie: "epicerie" },
    { id: "49", nom: "Quinoa", categorie: "epicerie" },
    { id: "50", nom: "Pois chiches", categorie: "epicerie" },
    { id: "51", nom: "Vinaigre", categorie: "epicerie" },
    { id: "52", nom: "Sauce tomate", categorie: "epicerie" },
  ],
  epices: [
    { id: "53", nom: "Sel", categorie: "epices" },
    { id: "54", nom: "Poivre", categorie: "epices" },
    { id: "55", nom: "Paprika", categorie: "epices" },
    { id: "56", nom: "Curry", categorie: "epices" },
    { id: "57", nom: "Cumin", categorie: "epices" },
    { id: "58", nom: "Cannelle", categorie: "epices" },
    { id: "59", nom: "Origan", categorie: "epices" },
    { id: "60", nom: "Basilic", categorie: "epices" },
    { id: "61", nom: "Thym", categorie: "epices" },
    { id: "62", nom: "Romarin", categorie: "epices" },
    { id: "63", nom: "Gingembre", categorie: "epices" },
    { id: "64", nom: "Ail en poudre", categorie: "epices" },
  ],
  boissons: [
    { id: "65", nom: "Eau", categorie: "boissons" },
    { id: "66", nom: "Jus d'orange", categorie: "boissons" },
    { id: "67", nom: "Café", categorie: "boissons" },
    { id: "68", nom: "Thé", categorie: "boissons" },
    { id: "69", nom: "Jus de pomme", categorie: "boissons" },
    { id: "70", nom: "Limonade", categorie: "boissons" },
    { id: "71", nom: "Lait d'amande", categorie: "boissons" },
    { id: "72", nom: "Jus de canneberge", categorie: "boissons" },
  ],
  autres: [
    { id: "73", nom: "Miel", categorie: "autres" },
    { id: "74", nom: "Noix", categorie: "autres" },
    { id: "75", nom: "Amandes", categorie: "autres" },
    { id: "76", nom: "Chocolat", categorie: "autres" },
    { id: "77", nom: "Biscuits", categorie: "autres" },
    { id: "78", nom: "Chips", categorie: "autres" },
    { id: "79", nom: "Beurre d'arachide", categorie: "autres" },
    { id: "80", nom: "Confiture", categorie: "autres" },
  ],
};

export default function CategoryItemSelector() {
  const [selectedCategory, setSelectedCategory] = useState<string>("viande");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("autres");
  const [loading, setLoading] = useState(false);

  const currentItems = POPULAR_ITEMS[selectedCategory] || [];

  const filteredItems = currentItems.filter((item) =>
    item.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddCustomItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Veuillez entrer un nom d'article");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/garde-manger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: newItemName.trim(),
          quantite: 1,
          unite: "unité",
        }),
      });

      if (response.ok) {
        toast.success(`${newItemName} ajouté au garde-manger !`);
        setNewItemName("");
        setAddModalOpen(false);
        // Rafraîchir la page pour voir le nouvel item
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/50 transition-shadow hover:shadow-xl"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            className="p-2 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Articles populaires
          </h2>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => setAddModalOpen(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </motion.div>
      </motion.div>

      {/* Catégories */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex gap-2 mb-4 overflow-x-auto pb-2"
      >
        {CATEGORIES.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedCategory(category.id);
              setSearchTerm("");
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              selectedCategory === category.id
                ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <span className="mr-1">{category.icon}</span>
            {category.nom}
          </motion.button>
        ))}
      </motion.div>

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un article..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Liste des items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="max-h-96 overflow-y-auto space-y-2 p-2"
        style={{ 
          scrollbarGutter: 'stable',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          paddingLeft: '0.5rem',
          paddingRight: '1.75rem' // Plus d'espace pour la scrollbar
        }}
      >
        <AnimatePresence mode="wait">
          {filteredItems.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500 dark:text-gray-400 py-4"
            >
              Aucun article trouvé
            </motion.p>
          ) : (
            filteredItems.map((item, index) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                  selectedItems.has(item.id)
                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-400"
                    : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-600"
                }`}
              >
                <span className="text-gray-900 dark:text-white font-medium">
                  {item.nom}
                </span>
                <AnimatePresence>
                  {selectedItems.has(item.id) && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.2 }}
                      className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal pour ajouter un item personnalisé */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setNewItemName("");
        }}
        title="Ajouter un article personnalisé"
        onConfirm={handleAddCustomItem}
        confirmText={loading ? "Ajout..." : "Ajouter"}
        cancelText="Annuler"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom de l'article
            </label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ex: Laitue, Thon, etc."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomItem();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Catégorie
            </label>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

