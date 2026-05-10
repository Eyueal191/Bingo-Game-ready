import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../contexts/ApiContext";
import WebApp from "@twa-dev/sdk";
import { normalizePhone } from "../utils/phoneUtils";
import { useAppConfig } from "../contexts/AppConfigContext";

export const useLoginForm = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, loading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const { config } = useAppConfig();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const [formLoading, setFormLoading] = useState(false);

  // Combine loading states
  const isLoading = authLoading || (WebApp?.initData && formLoading);
  const isSubmitLoading = formLoading;

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading &&  isAuthenticated) {
      let redirectPath = "/games";
      if (!isAdmin && location.state?.from && !["/login", "/"].includes(location.state.from)) {
        redirectPath = location.state.from;
      }
      if (isAdmin) {
        redirectPath = (!location.state?.from || ["/login", "/"].includes(location.state.from))
          ? "/bingo-dashboard"
          : location.state.from;
      }
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate, location.state]);

  const handleLogin = useCallback(async () => {
    console.log("SUBMIT:", { phone, password });
    if (!phone.trim() || !password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setFormLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await api.post("/api/v1/auth/login", { phone: normalizedPhone, password });
      const { token, user } = response.data;

      // Persistence
      localStorage.setItem("token", token);
      localStorage.setItem("fullName", user.fullName);
      localStorage.setItem("phone", user.phone || "");
      localStorage.setItem("wallet", user.wallet?.toString() || "0");
      localStorage.setItem("bonus", user.bonus?.toString() || "0");
      localStorage.setItem("referralCode", user.referralCode || "");
      localStorage.setItem("role", user.role);
      if (user.invitedBy) localStorage.setItem("invitedBy", user.invitedBy);

      login(token);
      toast.success("Login successful! Redirecting...");

      let redirectPath = "/games";
      if (user.role === "admin") {
        redirectPath = (!location.state?.from || ["/login", "/"].includes(location.state.from))
          ? "/bingo-dashboard"
          : location.state.from;
      } else if (location.state?.from && !["/login", "/"].includes(location.state.from)) {
        redirectPath = location.state.from;
      }

      setTimeout(() => navigate(redirectPath, { replace: true }), WebApp?.initData ? 0 : 1500);
    } catch (err) {
      toast.error(err.message === "Network Error" ? "Network error. Check connection." : (err.response?.data?.message || "Login failed."));
    } finally {
      setFormLoading(false);
      setPhone("");
      setPassword("");
    }
  }, [phone, password, navigate, login, api, location.state]);


  return {
    phone, setPhone,
    password, setPassword,
    showPassword, setShowPassword,
    isLoading,
    isSubmitLoading,
    handleLogin,
    config,
    isTelegramUser: !!WebApp?.initData
  };
};
