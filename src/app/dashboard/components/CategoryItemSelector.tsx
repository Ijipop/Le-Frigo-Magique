"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Plus, X, Search, Save, RotateCcw, ArrowUpDown } from "lucide-react";
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
    { id: "11", nom: "Agneau", categorie: "viande" },
    { id: "12", nom: "Veau", categorie: "viande" },
    { id: "13", nom: "Canard", categorie: "viande" },
    { id: "14", nom: "Bœuf", categorie: "viande" },
    { id: "15", nom: "Filet de porc", categorie: "viande" },
    { id: "16", nom: "Cuisse de poulet", categorie: "viande" },
    { id: "17", nom: "Poitrine de poulet", categorie: "viande" },
    { id: "18", nom: "Ailes de poulet", categorie: "viande" },
    { id: "19", nom: "Truite", categorie: "viande" },
    { id: "20", nom: "Cabillaud", categorie: "viande" },
    { id: "21", nom: "Morue", categorie: "viande" },
    { id: "22", nom: "Hareng", categorie: "viande" },
    { id: "23", nom: "Maquereau", categorie: "viande" },
    { id: "24", nom: "Sardines", categorie: "viande" },
    { id: "25", nom: "Homard", categorie: "viande" },
    { id: "26", nom: "Crabe", categorie: "viande" },
    { id: "27", nom: "Moules", categorie: "viande" },
    { id: "28", nom: "Huîtres", categorie: "viande" },
    { id: "29", nom: "Pétoncles", categorie: "viande" },
    { id: "30", nom: "Calmars", categorie: "viande" },
    { id: "31", nom: "Saucisses", categorie: "viande" },
    { id: "32", nom: "Jambon", categorie: "viande" },
    { id: "33", nom: "Saucisson", categorie: "viande" },
    { id: "34", nom: "Chorizo", categorie: "viande" },
    { id: "35", nom: "Boudin", categorie: "viande" },
  ],
  fruits: [
    { id: "101", nom: "Pommes", categorie: "fruits" },
    { id: "102", nom: "Bananes", categorie: "fruits" },
    { id: "103", nom: "Oranges", categorie: "fruits" },
    { id: "104", nom: "Fraises", categorie: "fruits" },
    { id: "105", nom: "Raisins", categorie: "fruits" },
    { id: "106", nom: "Avocats", categorie: "fruits" },
    { id: "107", nom: "Myrtilles", categorie: "fruits" },
    { id: "108", nom: "Mangues", categorie: "fruits" },
    { id: "109", nom: "Ananas", categorie: "fruits" },
    { id: "110", nom: "Citrons", categorie: "fruits" },
    { id: "111", nom: "Limes", categorie: "fruits" },
    { id: "112", nom: "Pamplemousses", categorie: "fruits" },
    { id: "113", nom: "Clémentines", categorie: "fruits" },
    { id: "114", nom: "Mandarines", categorie: "fruits" },
    { id: "115", nom: "Pêches", categorie: "fruits" },
    { id: "116", nom: "Nectarines", categorie: "fruits" },
    { id: "117", nom: "Abricots", categorie: "fruits" },
    { id: "118", nom: "Prunes", categorie: "fruits" },
    { id: "119", nom: "Cerises", categorie: "fruits" },
    { id: "120", nom: "Framboises", categorie: "fruits" },
    { id: "121", nom: "Mûres", categorie: "fruits" },
    { id: "122", nom: "Canneberges", categorie: "fruits" },
    { id: "123", nom: "Kiwi", categorie: "fruits" },
    { id: "124", nom: "Papaye", categorie: "fruits" },
    { id: "125", nom: "Pastèque", categorie: "fruits" },
    { id: "126", nom: "Melon", categorie: "fruits" },
    { id: "127", nom: "Melon d'eau", categorie: "fruits" },
    { id: "128", nom: "Cantaloup", categorie: "fruits" },
    { id: "129", nom: "Poires", categorie: "fruits" },
    { id: "130", nom: "Coings", categorie: "fruits" },
    { id: "131", nom: "Figues", categorie: "fruits" },
    { id: "132", nom: "Dattes", categorie: "fruits" },
    { id: "133", nom: "Grenades", categorie: "fruits" },
    { id: "134", nom: "Coco", categorie: "fruits" },
  ],
  legumes: [
    { id: "201", nom: "Carottes", categorie: "legumes" },
    { id: "202", nom: "Brocoli", categorie: "legumes" },
    { id: "203", nom: "Tomates", categorie: "legumes" },
    { id: "204", nom: "Oignons", categorie: "legumes" },
    { id: "205", nom: "Ail", categorie: "legumes" },
    { id: "206", nom: "Poivrons", categorie: "legumes" },
    { id: "207", nom: "Courgettes", categorie: "legumes" },
    { id: "208", nom: "Épinards", categorie: "legumes" },
    { id: "209", nom: "Champignons", categorie: "legumes" },
    { id: "210", nom: "Laitue", categorie: "legumes" },
    { id: "211", nom: "Concombres", categorie: "legumes" },
    { id: "212", nom: "Pommes de terre", categorie: "legumes" },
    { id: "213", nom: "Patates douces", categorie: "legumes" },
    { id: "214", nom: "Chou-fleur", categorie: "legumes" },
    { id: "215", nom: "Chou", categorie: "legumes" },
    { id: "216", nom: "Chou de Bruxelles", categorie: "legumes" },
    { id: "217", nom: "Chou frisé", categorie: "legumes" },
    { id: "218", nom: "Asperges", categorie: "legumes" },
    { id: "219", nom: "Haricots verts", categorie: "legumes" },
    { id: "220", nom: "Petits pois", categorie: "legumes" },
    { id: "221", nom: "Maïs", categorie: "legumes" },
    { id: "222", nom: "Aubergines", categorie: "legumes" },
    { id: "223", nom: "Céleri", categorie: "legumes" },
    { id: "224", nom: "Radis", categorie: "legumes" },
    { id: "225", nom: "Betteraves", categorie: "legumes" },
    { id: "226", nom: "Navets", categorie: "legumes" },
    { id: "227", nom: "Rutabaga", categorie: "legumes" },
    { id: "228", nom: "Panais", categorie: "legumes" },
    { id: "229", nom: "Poireaux", categorie: "legumes" },
    { id: "230", nom: "Échalotes", categorie: "legumes" },
    { id: "231", nom: "Artichauts", categorie: "legumes" },
    { id: "232", nom: "Bok choy", categorie: "legumes" },
    { id: "233", nom: "Endives", categorie: "legumes" },
    { id: "234", nom: "Roquette", categorie: "legumes" },
    { id: "235", nom: "Mâche", categorie: "legumes" },
    { id: "236", nom: "Cresson", categorie: "legumes" },
    { id: "237", nom: "Fenouil", categorie: "legumes" },
    { id: "238", nom: "Courge", categorie: "legumes" },
    { id: "239", nom: "Citrouille", categorie: "legumes" },
    { id: "240", nom: "Butternut", categorie: "legumes" },
  ],
  "produits-laitiers": [
    { id: "301", nom: "Lait", categorie: "produits-laitiers" },
    { id: "302", nom: "Fromage", categorie: "produits-laitiers" },
    { id: "303", nom: "Yogourt", categorie: "produits-laitiers" },
    { id: "304", nom: "Beurre", categorie: "produits-laitiers" },
    { id: "305", nom: "Œufs", categorie: "produits-laitiers" },
    { id: "306", nom: "Crème", categorie: "produits-laitiers" },
    { id: "307", nom: "Fromage cottage", categorie: "produits-laitiers" },
    { id: "308", nom: "Mozzarella", categorie: "produits-laitiers" },
    { id: "309", nom: "Cheddar", categorie: "produits-laitiers" },
    { id: "310", nom: "Gouda", categorie: "produits-laitiers" },
    { id: "311", nom: "Emmental", categorie: "produits-laitiers" },
    { id: "312", nom: "Brie", categorie: "produits-laitiers" },
    { id: "313", nom: "Camembert", categorie: "produits-laitiers" },
    { id: "314", nom: "Feta", categorie: "produits-laitiers" },
    { id: "315", nom: "Parmesan", categorie: "produits-laitiers" },
    { id: "316", nom: "Roquefort", categorie: "produits-laitiers" },
    { id: "317", nom: "Chèvre", categorie: "produits-laitiers" },
    { id: "318", nom: "Ricotta", categorie: "produits-laitiers" },
    { id: "319", nom: "Crème fraîche", categorie: "produits-laitiers" },
    { id: "320", nom: "Crème sure", categorie: "produits-laitiers" },
    { id: "321", nom: "Lait de coco", categorie: "produits-laitiers" },
    { id: "322", nom: "Lait d'amande", categorie: "produits-laitiers" },
    { id: "323", nom: "Lait de soja", categorie: "produits-laitiers" },
    { id: "324", nom: "Lait d'avoine", categorie: "produits-laitiers" },
    { id: "325", nom: "Kéfir", categorie: "produits-laitiers" },
    { id: "326", nom: "Fromage à la crème", categorie: "produits-laitiers" },
    { id: "327", nom: "Margarine", categorie: "produits-laitiers" },
  ],
  epicerie: [
    { id: "401", nom: "Pâtes", categorie: "epicerie" },
    { id: "402", nom: "Riz", categorie: "epicerie" },
    { id: "403", nom: "Pain", categorie: "epicerie" },
    { id: "404", nom: "Huile d'olive", categorie: "epicerie" },
    { id: "405", nom: "Farine", categorie: "epicerie" },
    { id: "406", nom: "Sucre", categorie: "epicerie" },
    { id: "407", nom: "Haricots", categorie: "epicerie" },
    { id: "408", nom: "Lentilles", categorie: "epicerie" },
    { id: "409", nom: "Quinoa", categorie: "epicerie" },
    { id: "410", nom: "Pois chiches", categorie: "epicerie" },
    { id: "411", nom: "Vinaigre", categorie: "epicerie" },
    { id: "412", nom: "Sauce tomate", categorie: "epicerie" },
    { id: "413", nom: "Riz brun", categorie: "epicerie" },
    { id: "414", nom: "Riz sauvage", categorie: "epicerie" },
    { id: "415", nom: "Orge", categorie: "epicerie" },
    { id: "416", nom: "Avoine", categorie: "epicerie" },
    { id: "417", nom: "Boulgour", categorie: "epicerie" },
    { id: "418", nom: "Couscous", categorie: "epicerie" },
    { id: "419", nom: "Semoule", categorie: "epicerie" },
    { id: "420", nom: "Sarrasin", categorie: "epicerie" },
    { id: "421", nom: "Millet", categorie: "epicerie" },
    { id: "422", nom: "Haricots noirs", categorie: "epicerie" },
    { id: "423", nom: "Haricots rouges", categorie: "epicerie" },
    { id: "424", nom: "Haricots blancs", categorie: "epicerie" },
    { id: "425", nom: "Haricots de Lima", categorie: "epicerie" },
    { id: "426", nom: "Lentilles vertes", categorie: "epicerie" },
    { id: "427", nom: "Lentilles rouges", categorie: "epicerie" },
    { id: "428", nom: "Lentilles brunes", categorie: "epicerie" },
    { id: "429", nom: "Pois cassés", categorie: "epicerie" },
    { id: "430", nom: "Fèves", categorie: "epicerie" },
    { id: "431", nom: "Huile de canola", categorie: "epicerie" },
    { id: "432", nom: "Huile de tournesol", categorie: "epicerie" },
    { id: "433", nom: "Huile de coco", categorie: "epicerie" },
    { id: "434", nom: "Huile de sésame", categorie: "epicerie" },
    { id: "435", nom: "Vinaigre balsamique", categorie: "epicerie" },
    { id: "436", nom: "Vinaigre de cidre", categorie: "epicerie" },
    { id: "437", nom: "Vinaigre de riz", categorie: "epicerie" },
    { id: "438", nom: "Sauce soja", categorie: "epicerie" },
    { id: "439", nom: "Sauce Worcestershire", categorie: "epicerie" },
    { id: "440", nom: "Ketchup", categorie: "epicerie" },
    { id: "441", nom: "Moutarde", categorie: "epicerie" },
    { id: "442", nom: "Mayonnaise", categorie: "epicerie" },
    { id: "443", nom: "Pâte de tomate", categorie: "epicerie" },
    { id: "444", nom: "Bouillon de poulet", categorie: "epicerie" },
    { id: "445", nom: "Bouillon de légumes", categorie: "epicerie" },
    { id: "446", nom: "Bouillon de bœuf", categorie: "epicerie" },
    { id: "447", nom: "Farine de blé", categorie: "epicerie" },
    { id: "448", nom: "Farine de maïs", categorie: "epicerie" },
    { id: "449", nom: "Farine d'amande", categorie: "epicerie" },
    { id: "450", nom: "Levure", categorie: "epicerie" },
    { id: "451", nom: "Levure chimique", categorie: "epicerie" },
    { id: "452", nom: "Bicarbonate de soude", categorie: "epicerie" },
    { id: "453", nom: "Sel de mer", categorie: "epicerie" },
    { id: "454", nom: "Sucre brun", categorie: "epicerie" },
    { id: "455", nom: "Miel", categorie: "epicerie" },
    { id: "456", nom: "Sirop d'érable", categorie: "epicerie" },
    { id: "457", nom: "Confiture", categorie: "epicerie" },
    { id: "458", nom: "Gelée", categorie: "epicerie" },
  ],
  epices: [
    { id: "501", nom: "Sel", categorie: "epices" },
    { id: "502", nom: "Poivre", categorie: "epices" },
    { id: "503", nom: "Paprika", categorie: "epices" },
    { id: "504", nom: "Curry", categorie: "epices" },
    { id: "505", nom: "Cumin", categorie: "epices" },
    { id: "506", nom: "Cannelle", categorie: "epices" },
    { id: "507", nom: "Origan", categorie: "epices" },
    { id: "508", nom: "Basilic", categorie: "epices" },
    { id: "509", nom: "Thym", categorie: "epices" },
    { id: "510", nom: "Romarin", categorie: "epices" },
    { id: "511", nom: "Gingembre", categorie: "epices" },
    { id: "512", nom: "Ail en poudre", categorie: "epices" },
    { id: "513", nom: "Oignon en poudre", categorie: "epices" },
    { id: "514", nom: "Coriandre", categorie: "epices" },
    { id: "515", nom: "Persil", categorie: "epices" },
    { id: "516", nom: "Aneth", categorie: "epices" },
    { id: "517", nom: "Estragon", categorie: "epices" },
    { id: "518", nom: "Sauge", categorie: "epices" },
    { id: "519", nom: "Marjolaine", categorie: "epices" },
    { id: "520", nom: "Laurier", categorie: "epices" },
    { id: "521", nom: "Muscade", categorie: "epices" },
    { id: "522", nom: "Clou de girofle", categorie: "epices" },
    { id: "523", nom: "Cardamome", categorie: "epices" },
    { id: "524", nom: "Fenouil", categorie: "epices" },
    { id: "525", nom: "Fenugrec", categorie: "epices" },
    { id: "526", nom: "Curcuma", categorie: "epices" },
    { id: "527", nom: "Garam masala", categorie: "epices" },
    { id: "528", nom: "Cayenne", categorie: "epices" },
    { id: "529", nom: "Piment de Cayenne", categorie: "epices" },
    { id: "530", nom: "Piment rouge", categorie: "epices" },
    { id: "531", nom: "Piment en flocons", categorie: "epices" },
    { id: "532", nom: "Sumac", categorie: "epices" },
    { id: "533", nom: "Za'atar", categorie: "epices" },
    { id: "534", nom: "Herbes de Provence", categorie: "epices" },
    { id: "535", nom: "Cinq épices", categorie: "epices" },
  ],
  boissons: [
    { id: "601", nom: "Eau", categorie: "boissons" },
    { id: "602", nom: "Jus d'orange", categorie: "boissons" },
    { id: "603", nom: "Café", categorie: "boissons" },
    { id: "604", nom: "Thé", categorie: "boissons" },
    { id: "605", nom: "Jus de pomme", categorie: "boissons" },
    { id: "606", nom: "Limonade", categorie: "boissons" },
    { id: "607", nom: "Lait d'amande", categorie: "boissons" },
    { id: "608", nom: "Jus de canneberge", categorie: "boissons" },
    { id: "609", nom: "Jus de raisin", categorie: "boissons" },
    { id: "610", nom: "Jus de pamplemousse", categorie: "boissons" },
    { id: "611", nom: "Jus de tomate", categorie: "boissons" },
    { id: "612", nom: "Jus de carotte", categorie: "boissons" },
    { id: "613", nom: "Smoothie", categorie: "boissons" },
    { id: "614", nom: "Thé vert", categorie: "boissons" },
    { id: "615", nom: "Thé noir", categorie: "boissons" },
    { id: "616", nom: "Thé à la camomille", categorie: "boissons" },
    { id: "617", nom: "Thé à la menthe", categorie: "boissons" },
    { id: "618", nom: "Café décaféiné", categorie: "boissons" },
    { id: "619", nom: "Espresso", categorie: "boissons" },
    { id: "620", nom: "Cappuccino", categorie: "boissons" },
    { id: "621", nom: "Latte", categorie: "boissons" },
    { id: "622", nom: "Limonade gazeuse", categorie: "boissons" },
    { id: "623", nom: "Cola", categorie: "boissons" },
    { id: "624", nom: "Gingembre", categorie: "boissons" },
    { id: "625", nom: "Eau gazeuse", categorie: "boissons" },
    { id: "626", nom: "Eau de coco", categorie: "boissons" },
    { id: "627", nom: "Lait de soja", categorie: "boissons" },
    { id: "628", nom: "Lait d'avoine", categorie: "boissons" },
    { id: "629", nom: "Lait de riz", categorie: "boissons" },
    { id: "630", nom: "Chocolat chaud", categorie: "boissons" },
    { id: "631", nom: "Vin rouge", categorie: "boissons" },
    { id: "632", nom: "Vin blanc", categorie: "boissons" },
    { id: "633", nom: "Bière", categorie: "boissons" },
  ],
  autres: [
    { id: "701", nom: "Miel", categorie: "autres" },
    { id: "702", nom: "Noix", categorie: "autres" },
    { id: "703", nom: "Amandes", categorie: "autres" },
    { id: "704", nom: "Chocolat", categorie: "autres" },
    { id: "705", nom: "Biscuits", categorie: "autres" },
    { id: "706", nom: "Chips", categorie: "autres" },
    { id: "707", nom: "Beurre d'arachide", categorie: "autres" },
    { id: "708", nom: "Confiture", categorie: "autres" },
    { id: "709", nom: "Noix de cajou", categorie: "autres" },
    { id: "710", nom: "Noix de pécan", categorie: "autres" },
    { id: "711", nom: "Noix de macadamia", categorie: "autres" },
    { id: "712", nom: "Pistaches", categorie: "autres" },
    { id: "713", nom: "Noisettes", categorie: "autres" },
    { id: "714", nom: "Noix du Brésil", categorie: "autres" },
    { id: "715", nom: "Graines de tournesol", categorie: "autres" },
    { id: "716", nom: "Graines de citrouille", categorie: "autres" },
    { id: "717", nom: "Graines de chia", categorie: "autres" },
    { id: "718", nom: "Graines de lin", categorie: "autres" },
    { id: "719", nom: "Graines de sésame", categorie: "autres" },
    { id: "720", nom: "Beurre d'amande", categorie: "autres" },
    { id: "721", nom: "Beurre de noix de cajou", categorie: "autres" },
    { id: "722", nom: "Tahini", categorie: "autres" },
    { id: "723", nom: "Chocolat noir", categorie: "autres" },
    { id: "724", nom: "Chocolat au lait", categorie: "autres" },
    { id: "725", nom: "Chocolat blanc", categorie: "autres" },
    { id: "726", nom: "Cacao en poudre", categorie: "autres" },
    { id: "727", nom: "Chips de pommes", categorie: "autres" },
    { id: "728", nom: "Crackers", categorie: "autres" },
    { id: "729", nom: "Bretzels", categorie: "autres" },
    { id: "730", nom: "Popcorn", categorie: "autres" },
    { id: "731", nom: "Granola", categorie: "autres" },
    { id: "732", nom: "Muesli", categorie: "autres" },
    { id: "733", nom: "Barres granola", categorie: "autres" },
    { id: "734", nom: "Fruits secs", categorie: "autres" },
    { id: "735", nom: "Raisins secs", categorie: "autres" },
    { id: "736", nom: "Abricots secs", categorie: "autres" },
    { id: "737", nom: "Dattes", categorie: "autres" },
    { id: "738", nom: "Figues séchées", categorie: "autres" },
    { id: "739", nom: "Cranberries séchées", categorie: "autres" },
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
  const [saving, setSaving] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  // Charger les préférences au montage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoadingPreferences(true);
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          if (data.data?.alimentsPreferes && Array.isArray(data.data.alimentsPreferes)) {
            setSelectedItems(new Set(data.data.alimentsPreferes));
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des préférences:", error);
      } finally {
        setLoadingPreferences(false);
      }
    };
    loadPreferences();
  }, []);

  const currentItems = POPULAR_ITEMS[selectedCategory] || [];

  const filteredItems = currentItems
    .filter((item) =>
      item.nom.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortAlphabetically) {
        return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
      }
      return 0; // Garder l'ordre original
    });

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

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alimentsPreferes: Array.from(selectedItems),
        }),
      });

      if (response.ok) {
        toast.success("Aliments préférés sauvegardés avec succès !");
        // Déclencher un événement pour mettre à jour les autres composants
        window.dispatchEvent(new CustomEvent("preferences-updated"));
      } else {
        const error = await response.json();
        toast.error(error.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPreferences = () => {
    setSelectedItems(new Set());
    toast.success("Préférences réinitialisées");
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
        className="mb-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            className="p-2 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
          </motion.div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Aliments préférés
          </h2>
        </div>

        {/* Boutons d'action - Optimisés pour mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            className="flex-1 sm:flex-initial"
          >
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter un aliment
            </Button>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            className="flex-1 sm:flex-initial"
          >
            <Button
              onClick={handleSavePreferences}
              disabled={saving || loadingPreferences}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            className="flex-1 sm:flex-initial"
          >
            <Button
              onClick={handleResetPreferences}
              disabled={saving || loadingPreferences || selectedItems.size === 0}
              variant="danger"
              size="sm"
              className="w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Réinitialiser
            </Button>
          </motion.div>
        </div>
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

      {/* Recherche et tri */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSortAlphabetically(!sortAlphabetically)}
          className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
            sortAlphabetically
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
          }`}
          title={sortAlphabetically ? "Désactiver le tri alphabétique" : "Trier par ordre alphabétique"}
        >
          <ArrowUpDown className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">A-Z</span>
        </motion.button>
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
        <AnimatePresence>
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

