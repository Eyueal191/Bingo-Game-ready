import React, { useMemo } from "react";
import { Box, Typography, IconButton, Tooltip, Divider } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "sonner";

const toTitleCase = (value = "") =>
  value
    .toString()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const AccountDetailItem = ({ label, value }) => {
  const copyToClipboard = () => {
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }
    navigator.clipboard.writeText(value);
    toast.success(`Copied "${label}" to clipboard`);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 1,
      }}
    >
      <Typography variant="body1" sx={{ color: "white" }}>
        <span style={{ fontWeight: "bold", color: "rgba(255,255,255,0.8)" }}>{label}:</span> {value}
      </Typography>
      <Tooltip title={`Copy ${label}`} placement="top">
        <IconButton
          size="small"
          onClick={copyToClipboard}
          sx={{ color: "#4ade80" }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const DepositAccountDetails = ({ accounts }) => {
  const manualAccounts = useMemo(
    () =>
      Array.isArray(accounts?.manual)
        ? accounts.manual.filter(
            (account) =>
              account &&
              account.isActive !== false &&
              (account.accountNumber || account.accountName)
          )
        : [],
    [accounts]
  );

  const hasManualAccounts = manualAccounts.length > 0;

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
      <Typography variant="h6" sx={{ color: "white", mb: 2, fontWeight: 'bold' }}>
        Payment Details
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 2 }}>
        Please transfer the amount to one of the following accounts:
      </Typography>
      <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.2)", borderRadius: 2 }}>
        {hasManualAccounts ? (
          manualAccounts.map((account, index) => (
            <Box key={account.provider || `${account.label}-${account.accountNumber}-${index}`} sx={{ mb: index === manualAccounts.length - 1 ? 0 : 2 }}>
              <Typography variant="body1" sx={{ color: "white", fontWeight: 600 }}>
                {account.label || toTitleCase(account.provider) || "Account"}
              </Typography>
              {account.accountName && (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Account Name: {account.accountName}
                </Typography>
              )}
              <AccountDetailItem
                label="Account Number"
                value={account.accountNumber}
              />
              {account.instructions && (
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.6)", display: "block", mt: 0.5 }}
                >
                  {account.instructions}
                </Typography>
              )}
              {index !== manualAccounts.length - 1 && (
                <Divider sx={{ mt: 2, mb: 2, borderColor: "rgba(255,255,255,0.1)" }} />
              )}
            </Box>
          ))
        ) : (
          <Typography variant="body2" sx={{ color: "#666" }}>
            Payment account information is currently unavailable. Please contact support for the latest deposit details.
          </Typography>
        )}
      </Box>
      {accounts?.instructions && (
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 2 }}>
          {accounts.instructions}
        </Typography>
      )}
      {accounts?.supportNote && (
        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
          {accounts.supportNote}
        </Typography>
      )}
    </Box>
  );
};

export default DepositAccountDetails;
