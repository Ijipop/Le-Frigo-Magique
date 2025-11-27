"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Mail, Code, Calendar, Shield, FileText, Crown, Sparkles } from "lucide-react";
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

  useEffect(() => {
    fetchSubscriptionStatus();
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
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Informations légales
        </h2>
      </div>

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

        {/* Informations de l'application */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-orange-500" />
            Application
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <span className="font-medium min-w-[120px]">Nom :</span>
              <span>Frigo Magique</span>
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
                ijipop88@gmail.com
              </a>
            </div>
          </div>
        </section>

        {/* Mentions légales */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Mentions légales
          </h3>
          <div className="space-y-4 text-gray-700 dark:text-gray-300 text-sm">
            <p>
              <strong>Éditeur :</strong> Frigo Magique
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
        </section>

        {/* Protection des données */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Protection des données personnelles
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300 text-sm">
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
        </section>

        {/* Conditions d'utilisation */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Conditions d'utilisation
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300 text-sm">
            <p>
              L'utilisation de cette application est soumise aux conditions suivantes :
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>L'application est fournie "en l'état" sans garantie d'aucune sorte.</li>
              <li>Les prix et rabais affichés sont fournis par des tiers et peuvent être sujets à changement.</li>
              <li>L'utilisateur est responsable de vérifier l'exactitude des informations avant tout achat.</li>
              <li>Nous ne sommes pas responsables des erreurs ou omissions dans les données des circulaires.</li>
            </ul>
          </div>
        </section>

        {/* Droit applicable */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-orange-500" />
            Droit applicable
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300 text-sm">
            <p>
              Les présentes conditions sont régies par les lois du Québec et du Canada. 
              Tout litige sera soumis à la juridiction exclusive des tribunaux du Québec.
            </p>
          </div>
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

