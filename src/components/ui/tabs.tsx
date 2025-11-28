"use client";

import { useState, ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  useEffect(() => {
    const handleOpenTutorial = () => {
      // Ouvrir l'onglet "À propos" (id: "legal")
      setActiveTab("legal");
    };

    window.addEventListener("open-tutorial", handleOpenTutorial);
    return () => {
      window.removeEventListener("open-tutorial", handleOpenTutorial);
    };
  }, []);

  // Exposer la fonction setActiveTab pour que les composants enfants puissent l'utiliser
  useEffect(() => {
    // Stocker l'état de l'onglet actif dans sessionStorage pour que les composants enfants puissent le détecter
    sessionStorage.setItem("active-tab", activeTab);
  }, [activeTab]);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className="w-full">
      {/* Navigation des onglets */}
      <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 max-md:overflow-x-auto max-md:scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 max-md:flex-shrink-0 flex items-center justify-center gap-2 max-md:gap-1 px-4 max-md:px-2 py-3 max-md:py-2 rounded-lg font-medium text-sm max-md:text-xs transition-all relative ${
              activeTab === tab.id
                ? "text-orange-500 dark:text-orange-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2 max-md:gap-1 max-md:whitespace-nowrap">
              {tab.icon}
              <span className="max-sm:hidden">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTabContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

