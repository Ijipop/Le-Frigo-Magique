import { type Metadata } from 'next'
import Link from 'next/link'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Frigo Magique - Planificateur de repas intelligent',
  description: 'Planifiez vos repas, économisez votre budget, et ne gaspillez plus jamais de nourriture',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                  Frigo Magique
                </Link>
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-gray-700 hover:text-orange-500 font-medium transition-colors">
                        Connexion
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-6 py-2 text-white font-semibold shadow-md transition-all hover:scale-105 hover:shadow-lg">
                        Inscription
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                </div>
              </div>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}