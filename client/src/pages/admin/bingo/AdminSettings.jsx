import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import { useAppConfig } from "../../../contexts/AppConfigContext";
import LeaderboardSection from "./adminSettings/sections/LeaderboardSection";
import { SECTIONS } from "./adminSettings/constants";
import {
  mapAccountToDraft,
  mergePaymentAccountsForUi,
  slugify,
  trimAt,
} from "./adminSettings/utils";
import IdentitySection from "./adminSettings/sections/IdentitySection";
import BrandingSection from "./adminSettings/sections/BrandingSection";
import BotSection from "./adminSettings/sections/BotSection";
import PaymentsSection from "./adminSettings/sections/PaymentsSection";
import BotPaymentsSection from "./adminSettings/sections/BotPaymentsSection";
import WalletSection from "./adminSettings/sections/WalletSection";
import BonusSection from "./adminSettings/sections/BonusSection";
import DepositBonusSection from "./adminSettings/sections/DepositBonusSection";

const AdminSettings = () => {
  const api = useApi();
  const { refresh } = useAppConfig();

  const [activeTab, setActiveTab] = useState(SECTIONS[0].id);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState(null);
  const [snack, setSnack] = useState(null);

  const [appConfig, setAppConfig] = useState(null);
  const [identity, setIdentity] = useState({
    appName: "",
    appNameLocalized: "",
    shortName: "",
    tagline: "",
  });
  const [branding, setBranding] = useState({
    logoUrl: "",
    squareLogoUrl: "",
    faviconUrl: "",
    primaryColor: "",
    secondaryColor: "",
    assetBaseUrl: "",
  });
  const [bot, setBot] = useState({
    botName: "",
    botUserName: "",
    supportUserName: "",
    supportChannelUrl: "",
  });
  const [walletRules, setWalletRules] = useState({
    minDepositAmount: "",
    minAutomaticDepositAmount: "",
    minWithdrawalAmount: "",
    minBalanceAfterWithdrawal: "",
    minWinsForWithdrawal: "",
    minDepositsForWithdrawal: "",
    minTransferAmount: "",
    maxTransferAmount: "",
  });
  const [depositBonus, setDepositBonus] = useState({
    enabled: false,
    percent: 0,
  });
   const [leaderboard, setLeaderboard] = useState({
    enabled: true,
    includeRobots: false,
  });
  const [paymentAccounts, setPaymentAccounts] = useState({
    manual: [],
    instructions: "",
    supportNote: "",
  });
  const [botPayments, setBotPayments] = useState({
    deposit: {
      flows: {
        manual: true,
        automatic: true,
        online: false,
      },
      methods: {
        cbe: true,
        telebirr: true,
        abyssinia: true,
        cbebirr: true,
        dashen: true,
        telebirr_online: true,
        cbe_online: true,
        mpesa_online: false,
      },
    },
    withdraw: {
      flows: {
        manual: true,
        automatic: false,
      },
      channels: {
        cbe: true,
        telebirr: true,
        abyssinia: true,
        cbebirr: true,
        dashen: true,
      },
    },
  });
  const [bonusSettings, setBonusSettings] = useState({
    isBonusEnabled: false,
    isReferralBonusEnabled: false,
    bonusAmount: 0,
    referralBonus: 0,
  });
  const brandingFileInputs = {
    logo: useRef(null),
    squareLogo: useRef(null),
    favicon: useRef(null),
  };
  const [uploadingBrandingField, setUploadingBrandingField] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [configRes, publicRes, adminRes] = await Promise.all([
        api.get("/api/v1/config"),
        api.get("/api/v1/config/public"),
        api.get("/api/v1/admin/settings"),
      ]);

      const configDoc = configRes.data || {};
      const publicConfig = publicRes.data || {};

      const mergedPaymentAccounts = mergePaymentAccountsForUi(
        publicConfig.paymentAccounts,
        configDoc.paymentAccounts
      );

      setAppConfig({
        ...configDoc,
        identity: {
          ...(publicConfig.identity || {}),
          ...(configDoc.identity || {}),
        },
        branding: {
          ...(publicConfig.branding || {}),
          ...(configDoc.branding || {}),
        },
        bot: {
          ...(publicConfig.bot || {}),
          ...(configDoc.bot || {}),
        },
        depositBonus: {
          ...(publicConfig.depositBonus || {}),
          ...(configDoc.depositBonus || {}),
        },
        walletRules: {
          ...(publicConfig.walletRules || {}),
          ...(configDoc.walletRules || {}),
        },
        paymentAccounts: mergedPaymentAccounts,
        botPayments: {
          ...(publicConfig.botPayments || {}),
          ...(configDoc.botPayments || {}),
        },
        promoBanner: {
          ...(publicConfig.promoBanner || {}),
          ...(configDoc.promoBanner || {}),
        },
        leaderboard: {
          ...(publicConfig.leaderboard || {}),
          ...(configDoc.leaderboard || {}),
        },
        robotEnabledGlobal:
          typeof configDoc.robotEnabledGlobal === "boolean"
            ? configDoc.robotEnabledGlobal
            : publicConfig.robotEnabledGlobal,
      });
      setBonusSettings({
        isBonusEnabled: Boolean(adminRes.data?.isBonusEnabled),
        isReferralBonusEnabled: Boolean(adminRes.data?.isReferralBonusEnabled),
        bonusAmount: adminRes.data?.bonusAmount ?? 0,
        referralBonus: adminRes.data?.referralBonus ?? 0,
      });
    } catch (err) {
      setSnack({
        severity: "error",
        msg:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appConfig) return;
    setIdentity({
      appName: appConfig.identity?.appName || "",
      appNameLocalized: appConfig.identity?.appNameLocalized || "",
      shortName: appConfig.identity?.shortName || "",
      tagline: appConfig.identity?.tagline || "",
    });
    setBranding({
      logoUrl: appConfig.branding?.logoUrl || "",
      squareLogoUrl: appConfig.branding?.squareLogoUrl || "",
      faviconUrl: appConfig.branding?.faviconUrl || "",
      primaryColor: appConfig.branding?.primaryColor || "",
      secondaryColor: appConfig.branding?.secondaryColor || "",
      assetBaseUrl: appConfig.branding?.assetBaseUrl || "",
    });
    setBot({
      botName: appConfig.bot?.botName || "",
      botUserName: appConfig.bot?.botUserName || "",
      supportUserName: appConfig.bot?.supportUserName || "",
      supportChannelUrl: appConfig.bot?.supportChannelUrl || "",
    });
    setWalletRules({
      minDepositAmount: appConfig.walletRules?.minDepositAmount ?? "",
      minAutomaticDepositAmount:
        appConfig.walletRules?.minAutomaticDepositAmount ?? "",
      minWithdrawalAmount: appConfig.walletRules?.minWithdrawalAmount ?? "",
      minBalanceAfterWithdrawal:
        appConfig.walletRules?.minBalanceAfterWithdrawal ?? "",
      minWinsForWithdrawal:
        appConfig.walletRules?.minWinsForWithdrawal ?? "",
      minDepositsForWithdrawal:
        appConfig.walletRules?.minDepositsForWithdrawal ?? "",
      minTransferAmount: appConfig.walletRules?.minTransferAmount ?? "",
      maxTransferAmount: appConfig.walletRules?.maxTransferAmount ?? "",
    });
    setDepositBonus({
      enabled: Boolean(appConfig.depositBonus?.enabled),
      percent: appConfig.depositBonus?.percent ?? 0,
    });
    setLeaderboard({
      enabled: Boolean(appConfig.leaderboard?.enabled ?? true),
      includeRobots: Boolean(appConfig.leaderboard?.includeRobots ?? false),
    });
    setPaymentAccounts({
      manual: Array.isArray(appConfig.paymentAccounts?.manual)
        ? appConfig.paymentAccounts.manual.map(mapAccountToDraft)
        : [],
      instructions: appConfig.paymentAccounts?.instructions || "",
      supportNote: appConfig.paymentAccounts?.supportNote || "",
    });
    if (appConfig.botPayments) {
      setBotPayments(appConfig.botPayments);
    }
  }, [appConfig]);

  const handleConfigSave = async (sectionKey, payload, successMessage) => {
    try {
      setSavingSection(sectionKey);
      const { data } = await api.put("/api/v1/config", { [sectionKey]: payload });
      setAppConfig(data);
      setSnack({ severity: "success", msg: successMessage || "Settings updated" });
      await refresh();
    } catch (err) {
      setSnack({
        severity: "error",
        msg: err.response?.data?.error || "Failed to save settings",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleBrandingUpload = async (field, fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const fieldNameMap = {
      logo: "logo",
      squareLogo: "squareLogo",
      favicon: "favicon",
    };
    const fieldName = fieldNameMap[field];
    if (!fieldName) return;

    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      setUploadingBrandingField(field);
      const { data } = await api.post("/api/v1/config/branding/upload", formData);
      if (data?.branding) {
        setBranding((prev) => ({
          ...prev,
          ...data.branding,
        }));
        setAppConfig((prev) => ({
          ...(prev || {}),
          branding: {
            ...(prev?.branding || {}),
            ...data.branding,
          },
        }));
        setSnack({ severity: "success", msg: "Branding asset uploaded" });
        await refresh();
      }
    } catch (err) {
      setSnack({
        severity: "error",
        msg: err.response?.data?.error || "Failed to upload asset",
      });
    } finally {
      setUploadingBrandingField(null);
      if (brandingFileInputs[field]?.current) {
        brandingFileInputs[field].current.value = "";
      }
    }
  };

  const handleBonusSave = async () => {
    try {
      setSavingSection("bonus");
      const payload = {
        isBonusEnabled: bonusSettings.isBonusEnabled,
        isReferralBonusEnabled: bonusSettings.isReferralBonusEnabled,
        bonusAmount: Number(bonusSettings.bonusAmount) || 0,
        referralBonus: Number(bonusSettings.referralBonus) || 0,
      };
      const { data } = await api.put("/api/v1/admin/settings", payload);
      setBonusSettings({
        isBonusEnabled: data.settings.isBonusEnabled,
        isReferralBonusEnabled: data.settings.isReferralBonusEnabled,
        bonusAmount: data.settings.bonusAmount,
        referralBonus: data.settings.referralBonus,
      });
      setSnack({ severity: "success", msg: data.message || "Bonus settings updated" });
    } catch (err) {
      setSnack({
        severity: "error",
        msg: err.response?.data?.message || "Failed to save bonus settings",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const normalizedPaymentPayload = useMemo(() => {
    const manual = paymentAccounts.manual
      .map((account) => ({
        ...account,
        provider:
          slugify(account.provider) ||
          slugify(account.label) ||
          (account.accountNumber ? `account-${account.accountNumber}` : ""),
        label: account.label.trim(),
        accountName: account.accountName.trim(),
        accountNumber: account.accountNumber.trim(),
        instructions: account.instructions.trim(),
        isActive: Boolean(account.isActive),
        metadata: account.metadata,
      }))
      .filter((account) => account.accountNumber || account.accountName);

    return {
      manual,
      instructions: paymentAccounts.instructions.trim(),
      supportNote: paymentAccounts.supportNote.trim(),
    };
  }, [paymentAccounts]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Platform Settings
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSettings}
            disabled={loading || savingSection !== null}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mb: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {SECTIONS.map((section) => (
          <Tab key={section.id} label={section.label} value={section.id} />
        ))}
      </Tabs>

      {activeTab === "identity" && (
        <IdentitySection
          identity={identity}
          setIdentity={setIdentity}
          saving={savingSection === "identity"}
          onSave={() =>
            handleConfigSave("identity", identity, "Identity updated")
          }
        />
      )}

      {activeTab === "branding" && (
        <BrandingSection
          branding={branding}
          setBranding={setBranding}
          brandingFileInputs={brandingFileInputs}
          uploadingBrandingField={uploadingBrandingField}
          onUpload={handleBrandingUpload}
          saving={savingSection === "branding"}
          onSave={() =>
            handleConfigSave("branding", branding, "Branding updated")
          }
        />
      )}

      {activeTab === "bot" && (
        <BotSection
          bot={bot}
          setBot={setBot}
          saving={savingSection === "bot"}
          onSave={() =>
            handleConfigSave(
              "bot",
              {
                ...bot,
                botUserName: trimAt(bot.botUserName),
                supportUserName: trimAt(bot.supportUserName),
              },
              "Bot settings updated"
            )
          }
        />
      )}

      {activeTab === "payments" && (
        <Stack spacing={2}>
          <PaymentsSection
            paymentAccounts={paymentAccounts}
            setPaymentAccounts={setPaymentAccounts}
            saving={savingSection === "paymentAccounts"}
            normalizedPaymentPayload={normalizedPaymentPayload}
            onSave={(payload) =>
              handleConfigSave(
                "paymentAccounts",
                payload,
                "Payment accounts updated"
              )
            }
          />

          <BotPaymentsSection
            botPayments={botPayments}
            setBotPayments={setBotPayments}
            saving={savingSection === "botPayments"}
            onSave={() =>
              handleConfigSave(
                "botPayments",
                botPayments,
                "Bot payment settings updated"
              )
            }
          />
        </Stack>
      )}

      {activeTab === "wallet" && (
        <>
          <DepositBonusSection
            depositBonus={depositBonus}
            setDepositBonus={setDepositBonus}
            saving={savingSection === "depositBonus"}
            onSave={() =>
              handleConfigSave(
                "depositBonus",
                {
                  enabled: Boolean(depositBonus.enabled),
                  percent: Number(depositBonus.percent) || 0,
                },
                "Deposit bonus updated"
              )
            }
          />

          <WalletSection
            walletRules={walletRules}
            setWalletRules={setWalletRules}
            saving={savingSection === "walletRules"}
            onSave={() =>
              handleConfigSave(
                "walletRules",
                Object.fromEntries(
                  Object.entries(walletRules).map(([key, value]) => [
                    key,
                    value === "" ? undefined : Number(value),
                  ])
                ),
                "Wallet rules updated"
              )
            }
          />
        </>
      )}

      {activeTab === "bonus" && (
        <BonusSection
          bonusSettings={bonusSettings}
          setBonusSettings={setBonusSettings}
          saving={savingSection === "bonus"}
          onSave={handleBonusSave}
        />
      )}
  {activeTab === "leaderboard" && (
        <LeaderboardSection
          leaderboard={leaderboard}
          setLeaderboard={setLeaderboard}
          saving={savingSection === "leaderboard"}
          onSave={() =>
            handleConfigSave("leaderboard", leaderboard, "Leaderboard settings updated")
          }
        />
      )}
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

export default AdminSettings;
