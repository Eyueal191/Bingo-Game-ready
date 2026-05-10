import  { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Switch,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import PromoBannerSettings from "./components/PromoBannerSettings";
import PromoSpotlightModal from "../../common/PromoSpotlightModal";

import { useApi } from "../../../contexts/ApiContext";
import SectionWrapper from "../../../components/common/SectionWrapper";

const AdminConfig = () => {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/v1/config`);
      // Ensure required nested objects exist
      data.promoBanner ||= {
        enabled: false,
        title: "",
        body: "",
        imageUrl: "",
        expiresAt: "",
        // Leave bgStart/bgEnd empty by default to use the global dynamic-bg gradient
        theme: {
          headerBg: "#ffd500",
          headerText: "#111",
          bgStart: "",
          bgEnd: "",
          ctaColor: "#f59e0b",
        },
        action: { label: "", url: "" },
      };
      data.robotEnabledGlobal = data.robotEnabledGlobal ?? true; // Default to true
      setCfg(data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const updateSection = async (sectionKey, sectionValue) => {
    if (!cfg) return;
    try {
      setSaving(true);
      await api.put(
        `/api/v1/config`,
        { [sectionKey]: sectionValue }
      );
      setSnack({ severity: "success", msg: `${sectionKey} saved` });
      await load(); // refresh
    } catch (e) {
      setSnack({
        severity: "error",
        msg:
          e.response?.data?.error ||
          e.message ||
          `Failed to save ${sectionKey}`,
      });
    } finally {
      setSaving(false);
    }
  };
  const handlePromoChange = (nextBanner) => {
    setCfg((prev) => ({
      ...prev,
      promoBanner: nextBanner,
    }));
  };
  const handlePromoSave = () => {
    if (!cfg?.promoBanner) return;
    updateSection("promoBanner", cfg.promoBanner);
  };
   const handlePromoPreview = () => {
    if (!cfg?.promoBanner) return;
    const previewPayload = {
      ...cfg.promoBanner,
      enabled: true,
      version: (cfg.promoBanner?.version || 1) + 0.001,
      previewToken: Date.now(),
    };
    window.dispatchEvent(
      new CustomEvent("promo:preview", { detail: previewPayload })
    );
  };
  const handlePromoBump = async () => {
    if (!cfg?.promoBanner) return;
    const nextVersion = (Number(cfg.promoBanner.version) || 0) + 1;
    const payload = {
      ...cfg.promoBanner,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    handlePromoChange(payload);
    await updateSection("promoBanner", payload);
  };

  const handlePromoUpload = async (file) => {
    if (!file) return null;
    try {
      const form = new FormData();
      form.append("promo", file);
      const { data } = await api.post(`/api/v1/config/promo-image`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const nextBanner = {
        ...cfg.promoBanner,
        imageUrl: data.imageUrl,
      };
      handlePromoChange(nextBanner);
      setSnack({ severity: "success", msg: "Promo image uploaded" });
      return data.imageUrl;
    } catch (err) {
      setSnack({
        severity: "error",
        msg: err.response?.data?.error || err.message || "Upload failed",
      });
      return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={load} startIcon={<Refresh />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
            <PromoSpotlightModal autoFetch={false} suppressAutoShow />
            <PromoBannerSettings
        banner={cfg.promoBanner}
        saving={saving}
        onChange={handlePromoChange}
        onSave={handlePromoSave}
        onPreview={handlePromoPreview}
        onUpload={handlePromoUpload}
        onBumpVersion={handlePromoBump}
      />
      

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {snack && (
          <Alert severity={snack.severity} sx={{ width: "100%" }}>
            {snack.msg}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default AdminConfig;