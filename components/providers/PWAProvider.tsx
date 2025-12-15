"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useServiceWorker } from "@/lib/hooks/useServiceWorker";
import { cn } from "@/lib/utils/cn";
import { WifiOff, RefreshCw, X, Download } from "lucide-react";

interface PWAContextType {
  isOffline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  installPWA: () => Promise<void>;
  updateServiceWorker: () => void;
}

const PWAContext = createContext<PWAContextType | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { isOffline, updateAvailable, updateServiceWorker } = useServiceWorker();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Check if PWA is installed
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();
    window.matchMedia("(display-mode: standalone)").addEventListener("change", checkInstalled);

    return () => {
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", checkInstalled);
    };
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Show offline banner when offline
  useEffect(() => {
    if (isOffline) {
      setShowOfflineBanner(true);
    } else {
      // Delay hiding to show "Back online" message
      const timeout = setTimeout(() => setShowOfflineBanner(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOffline]);

  // Show update banner when available
  useEffect(() => {
    if (updateAvailable) {
      setShowUpdateBanner(true);
    }
  }, [updateAvailable]);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleUpdate = () => {
    updateServiceWorker();
    setShowUpdateBanner(false);
  };

  return (
    <PWAContext.Provider
      value={{
        isOffline,
        isInstallable: !!deferredPrompt,
        isInstalled,
        updateAvailable,
        installPWA,
        updateServiceWorker,
      }}
    >
      {children}

      {/* Offline Banner */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-[100] transform transition-transform duration-300 ease-out",
          showOfflineBanner ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 mx-4 mb-4 rounded-lg shadow-lg",
            isOffline
              ? "bg-amber-500 text-amber-950"
              : "bg-green-500 text-green-950"
          )}
        >
          <div className="flex items-center gap-3">
            {isOffline ? (
              <>
                <WifiOff className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  You're offline. Some features may be limited.
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Back online!</span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowOfflineBanner(false)}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Update Banner */}
      <div
        className={cn(
          "fixed bottom-0 inset-x-0 z-[100] transform transition-transform duration-300 ease-out",
          showUpdateBanner && !showOfflineBanner ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 mx-4 mb-4 rounded-lg shadow-lg bg-blue-500 text-white">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">
              A new version is available!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="px-3 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              Update now
            </button>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </PWAContext.Provider>
  );
}

// Install PWA Button Component (can be used anywhere)
export function InstallPWAButton({ className }: { className?: string }) {
  const { isInstallable, isInstalled, installPWA } = usePWA();

  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={installPWA}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors",
        className
      )}
    >
      <Download className="h-4 w-4" />
      Install App
    </button>
  );
}