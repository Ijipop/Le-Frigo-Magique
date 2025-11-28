"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";

const STORAGE_KEY = "tutorial-link-dismissed";

export default function TutorialLink() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà fermé le lien
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleClick = () => {
    // Marquer que l'événement tutoriel a été déclenché
    sessionStorage.setItem("tutorial-event-triggered", "true");
    // Dispatcher un événement personnalisé pour ouvrir l'onglet "À propos" et le tutoriel
    window.dispatchEvent(new CustomEvent("open-tutorial"));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mb-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center justify-between gap-3"
      >
        <button
          onClick={handleClick}
          className="flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-colors flex-1 text-left"
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            Besoin d'aide ? Consultez le tutoriel pour apprendre à utiliser le site
          </span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

