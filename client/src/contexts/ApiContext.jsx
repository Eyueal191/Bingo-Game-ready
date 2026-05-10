import React, { createContext, useContext, useMemo } from "react";
import axios from "axios";
import { useAppStore } from "../store";
import { toast } from "sonner";

const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_APP_API_URL || "http://localhost:5000",
      withCredentials: true,
    });
    instance.interceptors.request.use((config) => {
      const currentToken = useAppStore.getState().token || localStorage.getItem("token");
      if (currentToken) config.headers.Authorization = `Bearer ${currentToken}`;
      return config;
    });
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error(error.message || "Network error. Please try again.");
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, []);
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = () => useContext(ApiContext);
