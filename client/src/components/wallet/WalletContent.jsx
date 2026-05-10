import DepositForm from "./DepositForm";
import TransactionHistory from "./TransactionHistory";
import WithdrawRequest from "./WithdrawRequest";
import WithdrawalRequirements from "./WithdrawalRequirements";

const WalletContent = ({
  activeTab,
  onDirectDeposit,
  onAutomaticWithdraw,
  transactions,
  isTransactionLoading,
  withdrawalText,
  minWithdrawal,
  minBalance,
  minDeposits,
  minWins,
}) => {
  switch (activeTab) {
    case "deposit":
      return <DepositForm onDirectSubmit={onDirectDeposit} />;
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
          <WithdrawRequest onAutomaticWithdraw={onAutomaticWithdraw} />
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

export default WalletContent;