import Link from 'next/link'
import { SignedOut, SignUpButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

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
              Planifiez vos repas, respecter votre budget, et ne gaspillez plus "jamais" de nourriture
            </p>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500 dark:text-gray-400">
              L'application intelligente qui transforme votre façon de cuisiner et de faire les courses
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
                    Commencer gratuitement
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
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-200 dark:bg-orange-900/20 opacity-30 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-rose-200 dark:bg-rose-900/20 opacity-30 blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="bg-white dark:bg-gray-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500 dark:text-orange-400">30%</div>
              <div className="mt-2 text-lg text-gray-600 dark:text-gray-300">d'économies en moyenne</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-rose-500 dark:text-rose-400">0</div>
              <div className="mt-2 text-lg text-gray-600 dark:text-gray-300">gaspillage alimentaire</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-500 dark:text-amber-400">100%</div>
              <div className="mt-2 text-lg text-gray-600 dark:text-gray-300">personnalisé selon vos goûts</div>
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
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Planification intelligente</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Planifiez vos repas de la semaine en fonction de vos préférences, de votre budget et de ce que vous avez déjà dans votre frigo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Gestion du budget</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Définissez votre budget hebdomadaire et recevez des suggestions de repas qui respectent vos contraintes financières.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Garde-manger virtuel</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Suivez ce que vous avez dans votre frigo et votre garde-manger. L'application vous suggère des recettes avec ce que vous avez déjà.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-rose-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Listes d'épicerie automatiques</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Générez automatiquement vos listes de courses en fonction de vos repas planifiés, avec estimation des coûts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recettes personnalisées</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Sauvegardez vos recettes favorites et recevez des suggestions basées sur vos préférences alimentaires et restrictions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg dark:shadow-gray-900/50 transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 to-pink-500">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rapide et intuitif</h3>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                Interface moderne et simple à utiliser. Planifiez votre semaine en quelques minutes seulement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 dark:from-orange-600 dark:via-rose-600 dark:to-amber-600 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">
            Prêt à transformer votre façon de manger ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-orange-50 dark:text-orange-100">
            Rejoignez des milliers d'utilisateurs qui économisent temps et argent chaque semaine
          </p>
          <div className="mt-10">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-orange-500 shadow-lg transition-all hover:scale-105 hover:shadow-xl">
                  Créer mon compte gratuit
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
