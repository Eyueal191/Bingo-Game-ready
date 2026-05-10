import axios from "axios";
import { toast } from "sonner";
import { useAppStore } from "../store";

// Shared Axios instance for non-React files (avoids using React hooks)
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL || "http://localhost:5000",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
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

export { api };
export default api;