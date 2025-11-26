"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--toast-bg)",
          color: "var(--toast-color)",
          border: "1px solid var(--toast-border)",
        },
        className: "dark:bg-gray-800 dark:text-white dark:border-gray-700",
      }}
    />
  );
}

