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
        let errorMessage = "Erreur lors de la redirection vers le paiement";
        
        try {
          const errorText = await res.text();
          console.log("Réponse d'erreur brute:", {
            status: res.status,
            statusText: res.statusText,
            textLength: errorText.length,
            textPreview: errorText.substring(0, 200),
          });
          
          if (errorText && errorText.trim()) {
            try {
              const errorData = JSON.parse(errorText);
              console.error("Erreur Checkout (JSON parsé):", {
                status: res.status,
                statusText: res.statusText,
                errorData,
                hasMessage: !!errorData.message,
                hasError: !!errorData.error,
                keys: Object.keys(errorData),
              });
              
              // Essayer plusieurs propriétés pour trouver le message
              errorMessage = errorData.message || 
                            errorData.error || 
                            errorData.details?.message ||
                            (typeof errorData.details === 'string' ? errorData.details : null) ||
                            `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
            } catch (parseError) {
              console.error("Erreur lors du parsing JSON:", parseError);
              // Si ce n'est pas du JSON, utiliser le texte brut
              errorMessage = errorText.length > 0 
                ? `Erreur ${res.status}: ${errorText.substring(0, 100)}`
                : `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
            }
          } else {
            console.error("Erreur Checkout: Réponse vide ou invalide", {
              status: res.status,
              statusText: res.statusText,
            });
            errorMessage = `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
          }
        } catch (error) {
          console.error("Erreur lors de la lecture de la réponse:", error);
          errorMessage = `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
        }
        
        toast.error(errorMessage);
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

