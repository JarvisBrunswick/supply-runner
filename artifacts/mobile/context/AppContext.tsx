import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

type Role = "consumer" | "driver";

interface AppUser {
  id: string;
  name: string;
  role: Role;
}

interface AppContextValue {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("sitedeliver_user").then((stored) => {
      if (stored) {
        try {
          setUserState(JSON.parse(stored));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const setUser = async (u: AppUser | null) => {
    if (u) {
      await AsyncStorage.setItem("sitedeliver_user", JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem("sitedeliver_user");
    }
    setUserState(u);
  };

  const value = useMemo(
    () => ({ user, setUser, isLoading }),
    [user, isLoading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
