import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, type AuthResponse, type AuthUser } from "@/lib/api";

const TOKEN_KEY = "beyondfear.token";
const USER_KEY = "beyondfear.user";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistAuth(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return { token, user: null };
  }

  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    localStorage.removeItem(USER_KEY);
    return { token, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredAuth();
    setUser(stored.user);
    setToken(stored.token);

    if (!stored.token) {
      setIsLoading(false);
      return;
    }

    authApi
      .me(stored.token)
      .then((result) => {
        setUser(result.user);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      })
      .catch(() => {
        clearAuth();
        setUser(null);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function applyAuth(promise: Promise<AuthResponse>) {
    const result = await promise;
    persistAuth(result);
    setUser(result.user);
    setToken(result.token);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login: async (email, password) => applyAuth(authApi.login(email, password)),
      signup: async (email, password) => applyAuth(authApi.signup(email, password)),
      logout: async () => {
        if (token) {
          try {
            await authApi.logout(token);
          } catch {
            // Frontend state clearing is still the source of truth for logout.
          }
        }
        clearAuth();
        setUser(null);
        setToken(null);
      },
      refreshProfile: async () => {
        if (!token) return;
        const result = await authApi.me(token);
        setUser(result.user);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      },
    }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}