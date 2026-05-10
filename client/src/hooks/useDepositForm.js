import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAppConfig } from "../contexts/AppConfigContext";
import { submitDirectDeposit, submitAutomaticDeposit as submitAutoDepositApi } from "../services/depositService";

export const useDepositForm = (onDirectSubmit) => {
  const { config } = useAppConfig();
  const flows = config?.botPayments?.deposit?.flows || { automatic: true };
  const methods = config?.botPayments?.deposit?.methods || {};

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (flows.online) tabs.push("online");
    if (flows.manual) tabs.push("manual");
    if (flows.automatic) tabs.push("automatic");
    return tabs;
  }, [flows]);

  const [activeTab, setActiveTab] = useState(availableTabs[0] || "automatic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [openDirectModal, setOpenDirectModal] = useState(false);
  const [openAutomaticModal, setOpenAutomaticModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Reset active tab if current tab becomes unavailable
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  const minDepositAmount = config.walletRules?.minDepositAmount ?? 50;
  const minAutomaticAmount = config.walletRules?.minAutomaticDepositAmount ?? minDepositAmount;

  const schema = useMemo(
    () =>
      z.object({
        amount: z
          .number({ invalid_type_error: "Amount is required" })
          .min(minDepositAmount, `Amount must be at least ${minDepositAmount} ETB`)
          .positive("Amount must be positive"),
      }),
    [minDepositAmount]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" },
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    reset();
    setSelectedMethod(null);
  };

  const openUploadModal = () => setIsUploadModalOpen(true);
  const closeUploadModal = () => setIsUploadModalOpen(false);
  const closeDirectModal = () => setOpenDirectModal(false);
  const closeAutomaticModal = () => {
    setOpenAutomaticModal(false);
    setSelectedAmount(null);
  };

  const onlineMethods = [
    { type: "telebirr", title: "Telebirr", logo: "/bingo_icon/Telebirr.png", isFeatured: true, key: "telebirr_online" },
    { type: "cbe", title: "CBE Birr", logo: "/bingo_icon/cbe-birr.png", isFeatured: true, key: "cbe_online" },
    { type: "mpesa", title: "M-Pesa", logo: null, isFeatured: false, key: "mpesa_online" },
  ].filter(m => methods[m.key]);

  const onSubmit = async (data) => {
    if (activeTab === "online" && !selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === "online") {
        if (data.amount < minDepositAmount) {
          setError("amount", { type: "manual", message: `Amount must be at least ${minDepositAmount} ETB` });
          setIsSubmitting(false);
          return;
        }
        clearErrors("amount");
        const response = await onDirectSubmit(data.amount, selectedMethod.toLowerCase());
        if (response?.success) {
          setSelectedAmount(data.amount);
          setOpenDirectModal(true);
        }
      } else if (activeTab === "automatic") {
        if (data.amount < minAutomaticAmount) {
          toast.error(`Amount must be at least ${minAutomaticAmount} ETB for automatic deposits`);
          setIsSubmitting(false);
          return;
        }
        setSelectedAmount(data.amount);
        setOpenAutomaticModal(true);
      }
      reset();
      setSelectedMethod(null);
    } catch (error) {
      toast.error(error.message || "Failed to process deposit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // State
    activeTab,
    availableTabs,
    isSubmitting,
    selectedMethod,
    openDirectModal,
    openAutomaticModal,
    selectedAmount,
    isUploadModalOpen,
    minDepositAmount,
    minAutomaticAmount,
    errors,
    onlineMethods,
    // Actions
    setSelectedMethod,
    handleTabChange,
    openUploadModal,
    closeUploadModal,
    closeDirectModal,
    closeAutomaticModal,
    onSubmit: handleSubmit(onSubmit),
    register,
    reset,
  };
};