import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../contexts/ApiContext";
import WebApp from "@twa-dev/sdk";
import { normalizePhone } from "../utils/phoneUtils";
import { useAppConfig } from "../contexts/AppConfigContext";

export const useRegisterForm = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, loading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const { config } = useAppConfig();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const [formLoading, setFormLoading] = useState(false);

  const isLoading = authLoading || (WebApp?.initData && formLoading);
  const isSubmitLoading = formLoading;

  const handleRegister = useCallback(async () => {
    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
        toast.error("Password must be at least 6 characters long.");
        return;
    }

    setFormLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await api.post("/api/v1/auth/register", { fullName: fullName.trim(), phone: normalizedPhone, password });
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
      toast.success("Registration successful! Redirecting...");

      let redirectPath = "/games";
      if (location.state?.from && !["/login", "/"].includes(location.state.from)) {
        redirectPath = location.state.from;
      }

      setTimeout(() => navigate(redirectPath, { replace: true }), WebApp?.initData ? 0 : 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setFormLoading(false);
      setPhone("");
      setPassword("");
      setFullName("");
    }
  }, [fullName, phone, password, navigate, login, api, location.state]);


  return {
    fullName, setFullName,
    phone, setPhone,
    password, setPassword,
    showPassword, setShowPassword,
    isLoading,
    isSubmitLoading,
    handleRegister,
    config,
    isTelegramUser: !!WebApp?.initData
  };
};
