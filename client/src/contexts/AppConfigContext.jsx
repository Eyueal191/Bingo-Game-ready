import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useApi } from "./ApiContext";

const DEFAULT_CONFIG = {
  identity: {
    appName: "",
    appNameLocalized: "",
    shortName: "",
    tagline: "",
  },
  branding: {
    logoUrl: "",
    squareLogoUrl: "",
    faviconUrl: "",
    primaryColor: "#1e88e5",
    secondaryColor: "#f5b301",
    assetBaseUrl: "",
  },
  bot: {
    botName: "",
    botUserName: "",
    supportUserName: "",
    supportChannelUrl: "",
  },
  walletRules: {
    minDepositAmount: undefined,
    minAutomaticDepositAmount: undefined,
    minWithdrawalAmount: undefined,
    minBalanceAfterWithdrawal: undefined,
    minWinsForWithdrawal: undefined,
    minDepositsForWithdrawal: undefined,
    minTransferAmount: undefined,
    maxTransferAmount: undefined,
  },
  paymentAccounts: {
    manual: [],
    instructions: "",
    supportNote: "",
  },
  promoBanner: {
    enabled: false,
  },
  leaderboard: {
    enabled: true,
    includeRobots: false,
  },
  robotEnabledGlobal: true,
};

const resolveBranding = (branding) => {
  const merged = {
    ...DEFAULT_CONFIG.branding,
    ...(branding || {}),
  };
  const base = (merged.assetBaseUrl || "").replace(/\/$/, "");
  const resolveUrl = (value) => {
    if (!value) return value;
    if (/^https?:/i.test(value)) return value;
    if (!base) return value;
    const trimmed = value.replace(/^\/+/, "");
    return `${base}/${trimmed}`;
  };
  return {
    ...merged,
    logoUrl: resolveUrl(merged.logoUrl),
    squareLogoUrl: resolveUrl(merged.squareLogoUrl),
    faviconUrl: resolveUrl(merged.faviconUrl),
  };
};

const AppConfigContext = createContext({
  config: DEFAULT_CONFIG,
  loading: true,
  error: null,
  refresh: async () => {},
});

const mergeConfig = (incoming = {}) => ({
  ...DEFAULT_CONFIG,
  ...incoming,
  identity: {
    ...DEFAULT_CONFIG.identity,
    ...(incoming.identity || {}),
  },
  branding: resolveBranding(incoming.branding),
  bot: {
    ...DEFAULT_CONFIG.bot,
    ...(incoming.bot || {}),
  },
  walletRules: {
    ...DEFAULT_CONFIG.walletRules,
    ...(incoming.walletRules || {}),
  },
  paymentAccounts: {
    manual: Array.isArray(incoming.paymentAccounts?.manual)
      ? incoming.paymentAccounts.manual.map((account) => ({ ...account }))
      : DEFAULT_CONFIG.paymentAccounts.manual,
    instructions:
      incoming.paymentAccounts?.instructions ??
      DEFAULT_CONFIG.paymentAccounts.instructions,
    supportNote:
      incoming.paymentAccounts?.supportNote ??
      DEFAULT_CONFIG.paymentAccounts.supportNote,
  },
  promoBanner: {
    ...DEFAULT_CONFIG.promoBanner,
    ...(incoming.promoBanner || {}),
  },
   leaderboard: {
    ...DEFAULT_CONFIG.leaderboard,
    ...(incoming.leaderboard || {}),
  },
});

export const AppConfigProvider = ({ children }) => {
  const api = useApi();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(
    async (showToastOnError = false) => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/v1/config/public");
        setConfig(mergeConfig(data));
        setError(null);
      } catch (err) {
        setError(err);
        if (showToastOnError) {
          const message =
            err?.response?.data?.error || err.message || "Failed to load settings";
          toast.error(message);
        }
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/v1/config/public");
        if (!cancelled) {
          setConfig(mergeConfig(data));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          console.error("Failed to load app config:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api]);

  const value = useMemo(
    () => ({
      config,
      loading,
      error,
      refresh: () => fetchConfig(true),
    }),
    [config, loading, error, fetchConfig]
  );

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = () => useContext(AppConfigContext);
