import { Box, Typography } from "@mui/material";

const WithdrawalRequirements = ({
  withdrawalText,
  minWithdrawal,
  minBalance,
  minDeposits,
  minWins,
}) => {
  return (
    <Box
      sx={{
        mb: 4,
        p: 3,
        bgcolor: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        borderRadius: 2,
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <Typography variant="h6" sx={{ color: "white", mb: 2, fontWeight: "bold" }}>
        Withdrawal Requirements
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 2 }}>
        To withdraw money, you need to fulfill the following requirements:
      </Typography>
      <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
        <Typography component="div" variant="body2" sx={{ color: "white", mb: 2 }}>
          <div className="space-y-3">
            {minWithdrawal > 0 && (
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">🎯</span>
                <span>{withdrawalText}</span>
              </div>
            )}
            {minBalance > 0 && (
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">💸</span>
                <span>Minimum remaining balance: {minBalance} Birr</span>
              </div>
            )}
            {minDeposits > 0 && (
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">💰</span>
                <span>
                  At least {minDeposits} previous deposit{minDeposits !== 1 ? "s" : ""} required
                </span>
              </div>
            )}
            {minWins > 0 && (
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">🏆</span>
                <span>
                  At least {minWins} game win{minWins !== 1 ? "s" : ""} required
                </span>
              </div>
            )}
          </div>
        </Typography>
      </Box>
    </Box>
  );
};

export default WithdrawalRequirements;