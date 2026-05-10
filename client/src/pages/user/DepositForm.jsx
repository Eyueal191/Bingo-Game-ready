import React from "react";
import DepositTabs from "../../components/wallet/DepositTabs";
import OnlineDepositForm from "../../components/wallet/OnlineDepositForm";
import ManualDepositSection from "../../components/wallet/ManualDepositSection";
import AutomaticDepositSection from "../../components/wallet/AutomaticDepositSection";
import { DirectDepositSuccessDialog } from "../../components/wallet/DepositDialogs";
import AutomaticDepositModal from "../../components/wallet/AutomaticDepositModal";
import { useDepositForm } from "../../hooks/useDepositForm";
import { useAppConfig } from "../../contexts/AppConfigContext";

const DepositForm = ({ onDirectSubmit }) => {
  const { config } = useAppConfig();
  const {
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
    setSelectedMethod,
    handleTabChange,
    openUploadModal,
    closeUploadModal,
    closeDirectModal,
    closeAutomaticModal,
    onSubmit,
    register,
  } = useDepositForm(onDirectSubmit);

  const paymentAccounts = config?.paymentAccounts || [];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "online":
        return (
          <OnlineDepositForm
            register={register}
            errors={errors}
            minDepositAmount={minDepositAmount}
            onlineMethods={onlineMethods}
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
          />
        );
      case "manual":
        return (
          <ManualDepositSection
            paymentAccounts={paymentAccounts}
            isUploadModalOpen={isUploadModalOpen}
            openUploadModal={openUploadModal}
            closeUploadModal={closeUploadModal}
          />
        );
      case "automatic":
        return (
          <AutomaticDepositSection
            register={register}
            errors={errors}
            minAutomaticAmount={minAutomaticAmount}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            paymentAccounts={paymentAccounts}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-white">Deposit</h2>
      <DepositTabs activeTab={activeTab} availableTabs={availableTabs} onChange={handleTabChange} />
      {renderActiveTab()}
      <DirectDepositSuccessDialog open={openDirectModal} onClose={closeDirectModal} />
      <AutomaticDepositModal open={openAutomaticModal} onClose={closeAutomaticModal} amount={selectedAmount} />
    </>
  );
};

export default DepositForm;