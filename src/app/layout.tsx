import { type Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { LayoutDashboard } from 'lucide-react'
import './globals.css'
import { Providers } from './providers'
import ThemeToggle from '../components/theme-toggle'
import { ToastProvider } from '../components/providers/toast-provider'
import UserButtonClient from '../components/UserButtonClient'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FrigoPop - Planificateur de repas intelligent',
  description: 'Planifiez vos repas, économisez votre budget, et ne gaspillez plus jamais de nourriture',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <Providers>
          <ClerkProvider
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
          >
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-2">
                  <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0 flex-shrink">
                    <Image
                      src="/logo.png"
                      alt="FrigoPop"
                      width={40}
                      height={40}
                      className="h-8 w-8 sm:h-10 sm:w-auto rounded-lg flex-shrink-0"
                      priority
                    />
                    <span className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent truncate">
                      FrigoPop
                    </span>
                  </Link>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <ThemeToggle />
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 font-medium transition-colors text-sm sm:text-base">
                          Connexion
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button className="rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-4 py-1.5 sm:px-6 sm:py-2 text-white font-semibold text-sm sm:text-base shadow-md transition-all hover:scale-105 hover:shadow-lg">
                          Inscription
                        </button>
                      </SignUpButton>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/dashboard"
                        className="text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 font-medium transition-colors hidden sm:inline-block"
                        title="Tableau de bord"
                      >
                        Tableau de bord
                      </Link>
                      <Link
                        href="/dashboard"
                        className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors sm:hidden"
                        title="Tableau de bord"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                      </Link>
                      <UserButtonClient />
                    </SignedIn>
                  </div>
                </div>
              </div>
            </header>
            {children}
            <ToastProvider />
          </ClerkProvider>
        </Providers>
      </body>
    </html>
  )
}