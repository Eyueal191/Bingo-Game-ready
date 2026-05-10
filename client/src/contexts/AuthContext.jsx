// [2024-06-09] Partial migration to Zustand: user, token, wallet, and loading state now use Zustand store.
import { toast } from "sonner";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  use,
} from "react";
import WebApp from "@twa-dev/sdk";
import { jwtDecode } from "jwt-decode";
import { useAppStore } from "../store";
import { useApi } from "./ApiContext";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Replace useState with Zustand store
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const clearUser = useAppStore((state) => state.clearUser);
  const wallet = useAppStore((state) => state.wallet);
  const setWallet = useAppStore((state) => state.setWallet);
  const bonus = useAppStore((state) => state.bonus);
  const setBonus = useAppStore((state) => state.setBonus);
  const loading = useAppStore((state) => state.loading);
  const setLoading = useAppStore((state) => state.setLoading);
  const token = useAppStore((state) => state.token);
  const setToken = useAppStore((state) => state.setToken);
  const clearToken = useAppStore((state) => state.clearToken);
  const api = useApi();

  const isTokenExpired = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 < Date.now();
    } catch (error) {
      console.error("Failed to decode token:", error);
      return true;
    }
  }, []);

  // Memoize logout to avoid re-creation on every render
  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem("token");
    localStorage.removeItem("role"); // Clear role on logout
    clearUser(); // Use Zustand action
    setWallet(0); // Reset wallet on logout
    setBonus(0); // Reset bonus on logout
  }, [clearToken, clearUser, setWallet, setBonus]);

  // Load token from localStorage on initial mount to keep user logged in across refresh
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, [setToken]);

  useEffect(() => {
    const authenticate = async () => {
      setLoading(true);
      try{
        
      if (token && isTokenExpired(token)) {
        toast.info("Session expired. Please log in again.");
        logout();
        setLoading(false);
        return;
      }
      const tg = WebApp;
      if (!tg) {
        // console.error("Telegram WebApp is not available");
        setLoading(false);
        return;
      }
      tg.ready();
      // console.log("Telegram Web App available:", tg);

      const tgInitData = tg.initData;
      // console.log("Telegram initData:", tgInitData);
      if (!token && tgInitData) {
        if (typeof tgInitData !== "string") {
          toast.error("Invalid Telegram authentication data");
          setLoading(false);
          return;
        }
        try {
          // Step 1: Authenticate with Telegram
          const response = await api.post("/api/v1/auth/telegram", {
            initData: tgInitData,
          });
          const { token: newToken, user } = response.data;
          setToken(newToken);
          localStorage.setItem("token", newToken);
          localStorage.setItem("referralCode", user.referralCode || "");
          localStorage.setItem("invitedBy", user.invitedBy);
          localStorage.setItem("role", user.role);
          setUser(user); // Use Zustand action
          if (user && typeof user.wallet !== "undefined") setWallet(user.wallet);
          if (user && typeof user.bonus !== "undefined") setBonus(user.bonus);
        } catch {
          toast.error("Authentication failed. Please try again.");
          logout();
        }
      }
        const currentToken = useAppStore.getState().token || localStorage.getItem("token");
      if (currentToken) {
        if (isTokenExpired(currentToken)) {
          toast.info("Session expired. Please log in again.");
          logout();
          return;
        }
          if (useAppStore.getState().user) {
            setLoading(false);
            return;
          }
        try {
          const response = await api.get("/api/v1/auth/profile");
          console.log("User profile fetched successfully:", response.data);
          const profileUser = response.data.user;
          setUser(profileUser); // Use Zustand action
          if (profileUser && typeof profileUser.wallet !== "undefined") setWallet(profileUser.wallet);
          if (profileUser && typeof profileUser.bonus !== "undefined") setBonus(profileUser.bonus);
        } catch (e) {
          console.log("Failed to fetch user profile:", e);
          toast.error("Failed to load user profile");
          logout();
        }
      }
      }
      catch (e) {
        console.error("Authentication error:", e);
       
      }
      finally{
         setLoading(false);
      }
    };

    authenticate();
  }, [token, isTokenExpired, setUser, setLoading, logout, api, setToken, setWallet, setBonus]);

  const userId = user?._id || null;
  const isAuthenticated = !!token;
  const role = user?.role || localStorage.getItem("role") || null;
  const isAdmin = role === "admin";
  const isGuest = role === "guest";
  const gamePermissions = user?.gamePermissions || {};
  const login = useCallback(
    (newToken) => {
      setToken(newToken);
      localStorage.setItem("token", newToken);
    },
    [setToken]
  );

  const contextValue = useMemo(
    () => ({
      token,
      user,
      userId,
      wallet,
      bonus,
      loading,
      role,
      isAdmin,
      isGuest,
      login,
      logout,
      isAuthenticated,
      gamePermissions,
    }),
    [
      token,
      user,
      userId,
      wallet,
      bonus,
      loading,
      role,
      isAdmin,
      isGuest,
      isAuthenticated,
      login,
      logout,
      gamePermissions,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
