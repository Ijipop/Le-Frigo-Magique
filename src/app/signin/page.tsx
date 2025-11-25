"use client";

import { SignIn } from "@clerk/nextjs";

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50">
      <SignIn />
    </div>
  );
}

export default SignInPage;
