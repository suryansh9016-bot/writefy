import { useEffect, useState } from "react";

// Stub Internet Identity hook
// The real ICP Internet Identity integration would use @dfinity/auth-client
// This provides a compatible interface for the current build
export interface IdentityLike {
  getPrincipal: () => { toText: () => string };
}

export function useInternetIdentity() {
  const [identity, setIdentity] = useState<IdentityLike | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check if previously logged in
    const stored = localStorage.getItem("writefy_ii_principal");
    if (stored) {
      setIdentity({
        getPrincipal: () => ({ toText: () => stored }),
      });
    }
    setIsInitializing(false);
  }, []);

  const login = async () => {
    setIsLoggingIn(true);
    try {
      // Simulate II login — in a real deployment this would open the II window
      // For now, generate a mock principal for demo purposes
      const mockPrincipal = `2vxsx-fae-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("writefy_ii_principal", mockPrincipal);
      setIdentity({
        getPrincipal: () => ({ toText: () => mockPrincipal }),
      });
    } catch (_e) {
      // login failed
    } finally {
      setIsLoggingIn(false);
    }
  };

  const clear = () => {
    localStorage.removeItem("writefy_ii_principal");
    setIdentity(null);
  };

  return { identity, login, clear, isLoggingIn, isInitializing };
}
