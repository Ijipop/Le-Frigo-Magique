"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export default function SignOutPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/");
    }
  }, [isSignedIn, router]);

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
          Déconnexion
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Êtes-vous sûr de vouloir vous déconnecter ?
        </p>
        <div className="flex flex-col gap-4">
          <SignOutButton>
            <button className="w-full rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 px-6 py-3 text-white font-semibold shadow-md transition-all hover:scale-105 hover:shadow-lg">
              Se déconnecter
            </button>
          </SignOutButton>
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-full border-2 border-gray-300 px-6 py-3 text-gray-700 font-semibold transition-all hover:border-orange-500 hover:text-orange-500"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

