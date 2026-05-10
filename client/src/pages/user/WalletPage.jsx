import React from "react";
import SideMenu from "../../components/wallet/SideMenu";
import DepositForm from "./DepositForm";
import TransactionHistory from "./TransactionHistory";
import WithdrawRequest from "./WithdrawRequest";
import WithdrawalRequirements from "../../components/wallet/WithdrawalRequirements";
import { useWalletPage } from "../../hooks/useWalletPage";

const WalletPage = () => {
  const {
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
  } = useWalletPage();

  const renderContent = () => {
    switch (activeTab) {
      case "deposit":
        return <DepositForm onDirectSubmit={handleDirectDeposit} />;
      case "withdraw":
        return (
          <>
            <WithdrawalRequirements
              withdrawalText={withdrawalText}
              minWithdrawal={minWithdrawal}
              minBalance={minBalance}
              minDeposits={minDeposits}
              minWins={minWins}
            />
            <WithdrawRequest onAutomaticWithdraw={handleAutomaticWithdraw} />
          </>
        );
      case "history":
        return (
          <TransactionHistory
            transactions={transactions}
            isLoading={isTransactionLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-16 pb-10">
        {/* Mobile SideMenu */}
        <div className="md:hidden mb-6">
          <SideMenu activeOption={activeTab} onOptionClick={handleTabChange} />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop SideMenu */}
          <div className="hidden md:block md:w-1/4">
            <SideMenu activeOption={activeTab} onOptionClick={handleTabChange} />
          </div>

          {/* Main Content Area */}
          <div className="w-full md:w-3/4">
            <div className="rounded-xl p-4 sm:p-6 shadow-lg">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;