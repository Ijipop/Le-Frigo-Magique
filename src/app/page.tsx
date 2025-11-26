import Link from 'next/link'
import { SignedOut, SignUpButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { 
  CheckCircle2, 
  Sparkles, 
  DollarSign, 
  ShoppingCart, 
  Calendar, 
  Heart,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users
} from 'lucide-react'

export default async function Home() {
  const { userId } = await auth();

  // Rediriger les utilisateurs connectés vers le dashboard
  if (userId) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl md:text-7xl">
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                Frigo Magique
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-8 text-gray-600 dark:text-gray-300 sm:text-2xl">
              Définissez votre budget, recevez des recettes personnalisées pour la semaine, et découvrez les meilleurs rabais
            </p>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500 dark:text-gray-400">
              L'application intelligente qui vous aide à bien manger tout en respectant votre budget hebdomadaire
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-8 py-4 text-lg font-semibold text-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl flex items-center gap-2">
                    Commencer gratuitement
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </SignUpButton>
              </SignedOut>
              <Link
                href="#features"
                className="rounded-full border-2 border-gray-300 dark:border-gray-600 px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-300 transition-all hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400"
              >
                En savoir plus
              </Link>
            </div>
            
            {/* Trust badges */}
            <div className="mt-12 flex items-center justify-center gap-8 flex-wrap opacity-60">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>100% Sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <DollarSign className="w-4 h-4" />
                <span>Respectez votre budget</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Zap className="w-4 h-4" />
                <span>Gratuit avec possibilité de payer pour les fonctionnalités avancées</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-200 dark:bg-orange-900/20 opacity-30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-rose-200 dark:bg-rose-900/20 opacity-30 blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-bold text-orange-500 dark:text-orange-400 mb-2">30%</div>
              <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">d'économies en moyenne</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-bold text-rose-500 dark:text-rose-400 mb-2">0</div>
              <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">gaspillage alimentaire</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div className="text-5xl font-bold text-amber-500 dark:text-amber-400 mb-2">100%</div>
              <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">personnalisé selon vos goûts</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl mb-4">
              Comment ça fonctionne ?
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              En 3 étapes simples, transformez votre façon de manger
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/50 h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Définissez votre budget
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Indiquez votre budget hebdomadaire pour les repas. C'est la base de toutes nos suggestions personnalisées.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/50 h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-500">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Recevez vos suggestions
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Notre IA vous propose un plan de repas complet pour la semaine, avec des recettes qui respectent exactement votre budget.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/50 h-full">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Découvrez les meilleurs rabais
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Consultez quelles épiceries proposent les meilleurs prix pour vos ingrédients. Optimisez vos achats et économisez encore plus.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">
              Tout ce dont vous avez besoin pour{' '}
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                bien manger
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Des fonctionnalités puissantes pour simplifier votre quotidien
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Suggestions basées sur votre budget</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Entrez votre budget hebdomadaire et recevez des suggestions de recettes personnalisées qui respectent exactement vos contraintes financières.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Rabais d'épiceries en temps réel</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Découvrez quelles épiceries proposent les meilleurs rabais sur les ingrédients de vos recettes. Économisez encore plus !
            </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Planification de la semaine</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Recevez un plan de repas complet pour toute la semaine, avec des recettes variées et équilibrées qui respectent votre budget.
            </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Listes de courses optimisées</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Générez automatiquement vos listes de courses avec les meilleurs prix par épicerie. Optimisez vos achats et respectez votre budget.
            </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 group-hover:scale-110 transition-transform">
                <Heart className="h-6 w-6 text-white" />
              </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Recettes adaptées à votre budget</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Des milliers de recettes triées par prix et adaptées à votre budget. Filtrez par préférences alimentaires, restrictions et goûts.
            </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl border border-gray-100 dark:border-gray-700">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-white" />
              </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Garde-manger optionnel</h3>
            <p className="text-gray-600 dark:text-gray-300">
              En bonus, suivez ce que vous avez déjà dans votre frigo. L'application en tiendra compte pour optimiser encore plus vos suggestions.
            </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl mb-4">
              Ce que disent nos utilisateurs
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Découvrez comment Frigo Magique aide les gens à mieux manger tout en respectant leur budget
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 border border-orange-100 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "J'ai un budget serré de 80$ par semaine pour 4 personnes. Frigo Magique me propose toujours des recettes délicieuses qui respectent mon budget. C'est génial !"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Sophie Martin</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Maman de 2 enfants</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 border border-rose-100 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "En tant qu'étudiant avec un budget limité, je peux enfin bien manger sans me ruiner. Les suggestions de recettes sont parfaites et je découvre toujours les meilleurs rabais !"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-white font-bold">
                  TD
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Thomas Dubois</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Étudiant</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 border border-amber-100 dark:border-gray-700">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "Je suis végétarienne et j'ai un budget de 60$ par semaine. L'app me propose des recettes variées et équilibrées qui respectent mon budget. Parfait !"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold">
                  LC
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Laura Chen</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Professionnelle</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl mb-4">
              Gratuit pour commencer, payant pour les fonctionnalités avancées
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Commencez gratuitement avec les fonctionnalités essentielles, débloquez les fonctionnalités avancées quand vous êtes prêt
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Gratuit</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">0$</span>
                  <span className="text-gray-600 dark:text-gray-400">/mois</span>
                </div>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="w-full rounded-full border-2 border-gray-300 dark:border-gray-600 px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 transition-all hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400">
                      Commencer
                    </button>
                  </SignUpButton>
                </SignedOut>
              </div>
                <ul className="mt-8 space-y-4">
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Suggestions de recettes basées sur le budget</span>
                </li>
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Planification de la semaine</span>
                </li>
                <li className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>Listes de courses de base</span>
                </li>
                <li className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                  <CheckCircle2 className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <span className="line-through">Rabais d'épiceries</span>
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 rounded-2xl p-8 shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-white text-orange-500 px-4 py-1 rounded-full text-sm font-semibold">
                  Populaire
                </span>
              </div>
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">4.99$</span>
                  <span className="opacity-90">/mois</span>
                </div>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="w-full rounded-full bg-white text-orange-500 px-6 py-3 font-semibold shadow-lg transition-all hover:bg-gray-100 hover:scale-105">
                      Essayer gratuitement
                    </button>
                  </SignUpButton>
                </SignedOut>
              </div>
              <ul className="mt-8 space-y-4 text-white">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Tout du plan Gratuit</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Rabais d'épiceries en temps réel</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Suggestions IA avancées</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Garde-manger illimité</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Recettes premium exclusives</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span>Support prioritaire</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 dark:from-orange-600 dark:via-rose-600 dark:to-amber-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl font-bold text-white sm:text-5xl mb-4">
            Prêt à transformer votre façon de manger ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-orange-50 dark:text-orange-100">
            Rejoignez la communauté qui économise temps et argent chaque semaine
          </p>
          <div className="mt-10">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-orange-500 shadow-xl transition-all hover:scale-105 hover:shadow-2xl flex items-center gap-2 mx-auto">
                  Créer mon compte gratuit
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white">Frigo Magique</h3>
            <p className="mt-2 text-gray-400 dark:text-gray-500">Votre assistant intelligent pour la planification de repas</p>
            <div className="mt-8 flex justify-center gap-6">
              <Link href="/signin" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">
                Connexion
              </Link>
              <Link href="/signup" className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-300">
                Inscription
              </Link>
            </div>
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-600">
              © 2025 Frigo Magique. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
