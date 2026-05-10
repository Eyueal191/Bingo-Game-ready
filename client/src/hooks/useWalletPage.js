import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApi } from "../contexts/ApiContext";
import { useAuth } from "../contexts/AuthContext";
import { useAppConfig } from "../contexts/AppConfigContext";

export const useWalletPage = () => {
  const location = useLocation();
  const api = useApi();
  const { token } = useAuth();
  const { config } = useAppConfig();

  // Get active tab from URL query param
  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "deposit";
  }, [location.search]);

  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  // Sync state with URL changes
  useEffect(() => {
    setActiveTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  // Wallet rules from config
  const walletRules = config?.walletRules || {};
  const flows = config?.botPayments?.withdraw?.flows || { manual: true, automatic: false };
  const minWithdrawal = walletRules.minWithdrawalAmount ?? 0;
  const minBalance = walletRules.minBalanceAfterWithdrawal ?? 0;
  const minDeposits = walletRules.minDepositsForWithdrawal ?? 0;
  const minWins = walletRules.minWinsForWithdrawal ?? 0;

  const withdrawalText = useMemo(() => {
    if (flows.manual && flows.automatic) {
      return `Minimum withdrawal: ${minWithdrawal} Birr for both manual and automatic modes`;
    } else if (flows.manual || flows.automatic) {
      return `Minimum withdrawal: ${minWithdrawal} Birr`;
    }
    return `Minimum withdrawal: ${minWithdrawal} Birr`;
  }, [flows.manual, flows.automatic, minWithdrawal]);

  // Transaction history query
  const {
    data: transactions = [],
    isLoading: isTransactionLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["transactionHistory"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/v1/transactions/mine");
        return response.data || [];
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast.error("Failed to load transaction history");
        return [];
      }
    },
    enabled: activeTab === "history" && !!token,
  });

  const handleTabChange = (option) => {
    setActiveTab(option);
    if (option === "history") {
      refetchTransactions();
    }
  };

  const handleDirectDeposit = async (amount, paymentMethod) => {
    try {
      const response = await api.post("/api/v1/addis-pay/deposit", {
        amount,
        paymentMethod: paymentMethod.toLowerCase(),
      });
      if (response.data.status === "success") {
        toast.success(`Direct payment of ${amount} ETB initiated`);
        return response.data;
      } else {
        throw new Error(response.data.error || "Failed to process direct payment");
      }
    } catch (error) {
      throw new Error(error.response?.data?.error || "Direct payment failed");
    }
  };

  const handleAutomaticWithdraw = async (amount, paymentMethod, phone) => {
    try {
      const response = await api.post("/api/v1/addis-pay/withdraw", {
        amount,
        paymentMethod: paymentMethod.toLowerCase(),
        phone,
      });
      if (response.data.status === "success") {
        toast.success(response.data.message);
        return response.data;
      } else {
        throw new Error(response.data.message || "Failed to process automatic withdrawal");
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || "Automatic withdrawal failed");
    }
  };

  return {
    activeTab,
    handleTabChange,
    transactions,
    isTransactionLoading,
    handleDirectDeposit,
    handleAutomaticWithdraw,
    withdrawalText,
    minWithdrawal,
    minBalance,
    minDeposits,
    minWins,
  };
};