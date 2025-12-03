"use client";

import { useState } from "react";
import { Crown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Button from "../../../components/ui/button";

interface GoPremiumButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function GoPremiumButton({ 
  className = "", 
  variant = "primary",
  size = "md" 
}: GoPremiumButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        console.error("Erreur Checkout:", errorData);
        toast.error(errorData.message || "Erreur lors de la redirection vers le paiement");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error("URL de paiement non disponible");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erreur lors de la création du checkout:", error);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      size={size}
      className={`${className} ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Redirection...
        </>
      ) : (
        <>
          <Crown className="w-4 h-4 mr-2" />
          Passer à FrigoPop Premium
        </>
      )}
    </Button>
  );
}

