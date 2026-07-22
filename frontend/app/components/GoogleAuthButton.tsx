"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Google authentication failed. Please try again.";
}

export default function GoogleAuthButton() {
  const { googleLogin } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configError = GOOGLE_CLIENT_ID ? "" : "Google Sign-In is not configured.";

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const initializeGoogleSignIn = () => {
      if (!window.google || !buttonRef.current || initializedRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google did not return an ID token.");
            return;
          }

          setLoading(true);
          setError("");
          try {
            await googleLogin(response.credential);
          } catch (err: unknown) {
            setError(getErrorMessage(err));
            setLoading(false);
          }
        },
      });

      const buttonWidth = Math.min(buttonRef.current.offsetWidth || 320, 400);
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: buttonWidth,
        text: "continue_with",
      });

      initializedRef.current = true;
    };

    if (window.google) {
      initializeGoogleSignIn();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogleSignIn);
      return () => existingScript.removeEventListener("load", initializeGoogleSignIn);
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    script.onerror = () => setError("Failed to load Google Sign-In.");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleLogin]);

  return (
    <div className="w-full space-y-3">
      <div
        ref={buttonRef}
        className={`flex min-h-11 w-full justify-center ${loading ? "pointer-events-none opacity-60" : ""}`}
      />
      {(error || configError) && (
        <div className="rounded border-2 border-red-500 bg-red-50 p-2.5 text-center font-casual text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
          {error || configError}
        </div>
      )}
    </div>
  );
}
