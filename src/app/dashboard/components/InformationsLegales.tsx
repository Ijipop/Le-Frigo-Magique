"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Mail, Code, Calendar, Shield, FileText, Crown, Sparkles, ChevronDown, BookOpen, ChefHat, ShoppingBag, DollarSign, Heart, User } from "lucide-react";
import Button from "../../../components/ui/button";
import { toast } from "sonner";

interface SubscriptionStatus {
  isPremium: boolean;
  premiumUntil: string | null;
  isExpired: boolean;
}

export default function InformationsLegales() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mentionsLegalesExpanded, setMentionsLegalesExpanded] = useState(false);
  const [tutorialExpanded, setTutorialExpanded] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    const handleOpenTutorial = () => {
      // Attendre un court délai pour que l'onglet soit complètement chargé
      setTimeout(() => {
        setTutorialExpanded(true);
      }, 400);
    };

    window.addEventListener("open-tutorial", handleOpenTutorial);
    return () => {
      window.removeEventListener("open-tutorial", handleOpenTutorial);
    };
  }, []);

  // Ouvrir automatiquement l'accordéon si on arrive sur cet onglet via le lien tutoriel
  useEffect(() => {
    // Vérifier si l'événement a été déclenché récemment
    const checkTutorialEvent = () => {
      const eventTriggered = sessionStorage.getItem("tutorial-event-triggered");
      if (eventTriggered === "true") {
        // Vérifier périodiquement si l'onglet est actif
        const interval = setInterval(() => {
          const activeTab = sessionStorage.getItem("active-tab");
          if (activeTab === "legal") {
            setTimeout(() => {
              setTutorialExpanded(true);
              sessionStorage.removeItem("tutorial-event-triggered");
            }, 400);
            clearInterval(interval);
          }
        }, 100);

        // Nettoyer après 5 secondes maximum
        setTimeout(() => {
          clearInterval(interval);
          sessionStorage.removeItem("tutorial-event-triggered");
        }, 5000);
      }
    };

    checkTutorialEvent();
    
    // Vérifier aussi immédiatement au montage
    const eventTriggered = sessionStorage.getItem("tutorial-event-triggered");
    const activeTab = sessionStorage.getItem("active-tab");
    if (eventTriggered === "true" && activeTab === "legal") {
      setTimeout(() => {
        setTutorialExpanded(true);
        sessionStorage.removeItem("tutorial-event-triggered");
      }, 400);
    }
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement du statut:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = () => {
    // TODO: Implémenter la logique d'abonnement (Stripe, PayPal, etc.)
    toast.info("Fonctionnalité d'abonnement à venir prochainement !");
    // Pour l'instant, on peut juste afficher un message
    // Plus tard, rediriger vers une page de paiement
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700"
    >
      <div className="space-y-6">
        {/* Statut d'abonnement */}
        <section className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              Statut d'abonnement
            </h3>
            {subscriptionStatus?.isPremium && (
              <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-sm font-semibold rounded-full flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                Premium
              </span>
            )}
          </div>
          
          {loading ? (
            <div className="text-gray-600 dark:text-gray-400">Chargement...</div>
          ) : subscriptionStatus?.isPremium ? (
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Vous utilisez la version Premium</strong>
              </p>
              {subscriptionStatus.premiumUntil && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Abonnement valide jusqu'au :{" "}
                  <strong>
                    {new Date(subscriptionStatus.premiumUntil).toLocaleDateString('fr-CA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </strong>
                </p>
              )}
              <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Avantages Premium :
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                  <li>Recherche illimitée de rabais</li>
                  <li>Historique des prix</li>
                  <li>Notifications de rabais personnalisées</li>
                  <li>Support prioritaire</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Vous utilisez la version gratuite</strong>
              </p>
              <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Passez à Premium pour :
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside mb-4">
                  <li>Recherche illimitée de rabais</li>
                  <li>Historique des prix et tendances</li>
                  <li>Notifications de rabais personnalisées</li>
                  <li>Support prioritaire</li>
                  <li>Analyses avancées d'économies</li>
                </ul>
                <Button
                  onClick={handleSubscribe}
                  variant="primary"
                  className="w-full"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  S'abonner à Premium
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Tutoriel - Accordéon */}
        <section className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
          <motion.button
            onClick={() => setTutorialExpanded(!tutorialExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Comment utiliser le site
            </h3>
            <motion.div
              animate={{ rotate: tutorialExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {tutorialExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-4 text-gray-700 dark:text-gray-300">
                  {/* Étape 1 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-500" />
                          Configurez vos préférences
                        </h4>
                        <p className="text-sm">
                          Cliquez sur l'onglet <strong>"Préférences"</strong> en haut. 
                          Indiquez votre budget, vos allergies et vos aliments préférés. 
                          <strong className="text-orange-600 dark:text-orange-400"> Important : </strong>
                          N'oubliez pas de cliquer sur le bouton <strong>"Sauvegarder"</strong> pour enregistrer vos choix !
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Étape 2 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <ChefHat className="w-4 h-4 text-orange-500" />
                          Trouvez des recettes
                        </h4>
                        <p className="text-sm">
                          Allez dans <strong>"FrigoPop"</strong>. 
                          Le site recherche automatiquement des recettes selon :
                        </p>
                        <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
                          <li>Ce que vous avez dans votre <strong>garde-manger</strong></li>
                          <li>Vos <strong>aliments favoris</strong> (configurés dans Préférences)</li>
                          <li>Les <strong>recherches rapides</strong> (filtres comme Keto, Au grill, etc.)</li>
                        </ul>
                        <p className="text-sm mt-2">
                          Des recettes apparaissent automatiquement ! Cliquez sur le <strong>+</strong> pour les ajouter à votre semaine.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Étape 3 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          Générez votre menu de la semaine
                        </h4>
                        <p className="text-sm">
                          Dans l'onglet <strong>"Budget"</strong>, choisissez le nombre de jours et les repas (déjeuner, dîner, souper). 
                          Cliquez sur <strong>"Générer les recettes de la semaine"</strong>. 
                          Sélectionnez celles qui vous plaisent et ajoutez-les !
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Étape 4 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-orange-500" />
                          Faites votre liste d'épicerie
                        </h4>
                        <p className="text-sm">
                          Allez dans <strong>"Épicerie"</strong>. 
                          Cliquez sur <strong>"Ajouter"</strong> pour mettre des produits dans votre liste. 
                          Cliquez sur <strong>"Chercher les rabais"</strong> pour voir les meilleurs prix près de chez vous !
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Étape 5 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        5
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-orange-500" />
                          Sauvegardez vos recettes préférées
                        </h4>
                        <p className="text-sm">
                          Quand vous trouvez une recette que vous aimez, cliquez sur le <strong>cœur</strong> ❤️. 
                          Elle sera sauvegardée dans l'onglet <strong>"Favoris"</strong> pour plus tard !
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                      💡 <strong>Astuce :</strong> Vous pouvez revenir à ce tutoriel à tout moment en cliquant sur "À propos" !
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Informations de l'application */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-orange-500" />
            Application
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <span className="font-medium min-w-[120px]">Nom :</span>
              <span>FrigoPop</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium min-w-[120px]">Version :</span>
              <span>0.0.5</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-medium min-w-[120px]">Date de publication :</span>
              <span>{new Date().getFullYear()}</span>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-500" />
            Contact
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <span className="font-medium min-w-[120px]">Email :</span>
              <a 
                href="mailto:contact@frigomagique.ca" 
                className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 underline"
              >
                ijipop82@gmail.com
              </a>
            </div>
          </div>
          
          {/* Titre Informations légales sous l'email */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Informations légales
              </h3>
            </div>
          </div>
        </section>

        {/* Mentions légales - Accordéon */}
        <section className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          <motion.button
            onClick={() => setMentionsLegalesExpanded(!mentionsLegalesExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              Mentions légales
            </h3>
            <motion.div
              animate={{ rotate: mentionsLegalesExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {mentionsLegalesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-6 text-gray-700 dark:text-gray-300 text-sm">
                  {/* Mentions légales */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Mentions légales
                    </h4>
                    <div className="space-y-2">
                      <p>
                        <strong>Éditeur :</strong> FrigoPop
                      </p>
                      <p>
                        <strong>Propriétaire :</strong> Jean-François Lefebvre
                      </p>
                      <p>
                        <strong>Adresse :</strong> 2020 du Finfin, Montréal, QC
                      </p>
                      <p>
                        <strong>Numéro d'entreprise du Québec (NEQ) :</strong> [non disponible]
                      </p>
                    </div>
                  </div>

                  {/* Protection des données */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      Protection des données personnelles
                    </h4>
                    <div className="space-y-2">
                      <p>
                        Conformément à la <strong>Loi sur la protection des renseignements personnels dans le secteur privé</strong> du Québec, 
                        vos données personnelles sont collectées et utilisées uniquement dans le cadre de l'utilisation de l'application.
                      </p>
                      <p>
                        <strong>Données collectées :</strong> Code postal, préférences alimentaires, liste d'épicerie, recettes sauvegardées.
                      </p>
                      <p>
                        <strong>Finalité :</strong> Personnalisation de votre expérience et recherche de rabais dans les circulaires.
                      </p>
                      <p>
                        <strong>Conservation :</strong> Vos données sont conservées aussi longtemps que votre compte est actif. 
                        Vous pouvez demander la suppression de vos données à tout moment en nous contactant.
                      </p>
                      <p>
                        <strong>Droits :</strong> Vous avez le droit d'accéder, de rectifier et de supprimer vos données personnelles.
                      </p>
                    </div>
                  </div>

                  {/* Conditions d'utilisation */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Conditions d'utilisation
                    </h4>
                    <div className="space-y-2">
                      <p>
                        L'utilisation de cette application est soumise aux conditions suivantes :
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>L'application est fournie "en l'état" sans garantie d'aucune sorte.</li>
                        <li>Les prix et rabais affichés sont fournis par des tiers et peuvent être sujets à changement.</li>
                        <li>L'utilisateur est responsable de vérifier l'exactitude des informations avant tout achat.</li>
                        <li>Nous ne sommes pas responsables des erreurs ou omissions dans les données des circulaires.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Droit applicable */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-orange-500" />
                      Droit applicable
                    </h4>
                    <div className="space-y-2">
                      <p>
                        Les présentes conditions sont régies par les lois du Québec et du Canada. 
                        Tout litige sera soumis à la juridiction exclusive des tribunaux du Québec.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Dernière mise à jour */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Dernière mise à jour : {new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

