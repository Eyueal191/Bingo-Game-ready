import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
        mb: 1.5,
        p: 1.5,
        bgcolor: "rgba(255, 255, 255, 0.04)",
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <Box sx={{ flex: 1, mr: 1 }}>
        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", display: "block", mb: 0.2 }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ color: "white", fontWeight: 500, fontSize: { xs: "0.9rem", sm: "1rem" }, wordBreak: "break-all" }}>
          {value}
        </Typography>
      </Box>
      <Tooltip title={`Copy ${label}`} placement="top">
        <IconButton
          size="small"
          onClick={copyToClipboard}
          sx={{
            color: "#55ff77",
            bgcolor: "rgba(85, 255, 119, 0.1)",
            "&:hover": { bgcolor: "rgba(85, 255, 119, 0.2)" }
          }}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

const DepositAccountDetails = ({ paymentMethods, amount, exchangeRate, currencySymbol }) => {
  const convertedAmount = (amount * exchangeRate).toFixed(2);
  const manualAccounts = useMemo(
    () =>
      Array.isArray(paymentMethods)
        ? paymentMethods.filter(
          (account) => {
            if (!account || account.isActive === false || !(account.accountNumber || account.accountName)) return false;
            return true;
          }
        )
        : [],
    [paymentMethods]
  );

  const hasManualAccounts = manualAccounts.length > 0;

  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 2.5, sm: 3 },
        bgcolor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 4,
        border: "1px solid rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      }}
    >
      <Box sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)", display: "inline-flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ p: 1, px: 1.5, borderRadius: 2, bgcolor: "#55ff77", color: "#0f1221", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontWeight: 900, fontSize: "0.9rem", lineHeight: 1 }}>STEP 1</Typography>
        </Box>
        <Typography variant="h6" sx={{ color: "white", fontWeight: 800, letterSpacing: "0.5px", fontSize: { xs: "1rem", sm: "1.2rem" } }}>
          Transfer Funds
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)", mb: 3, fontStyle: "italic", fontSize: "0.85rem" }}>
        Please transfer the exact amount to one of the following accounts:
      </Typography>

      {amount > 0 && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, rgba(85, 255, 119, 0.1) 0%, rgba(17, 110, 81, 0.1) 100%)",
            border: "1px solid rgba(85, 255, 119, 0.2)",
            textAlign: "center"
          }}
        >
          <Typography variant="caption" sx={{ color: "rgba(85, 255, 119, 0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Total Amount Due
          </Typography>
          <Typography variant="h5" sx={{ color: "#55ff77", fontWeight: 700, mt: 0.5 }}>
            {convertedAmount} {currencySymbol}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", display: "block", mt: 0.5 }}>
            Equivalent to {amount} coins
          </Typography>
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {hasManualAccounts ? (
          manualAccounts.map((account, index) => (
            <Accordion
              key={account.provider || `${account.label}-${account.accountNumber}-${index}`}
              defaultExpanded={index === 0}
              disableGutters
              elevation={0}
              sx={{
                borderRadius: "16px !important",
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
                "&:before": { display: "none" },
                "&.Mui-expanded": {
                  borderColor: "rgba(85, 255, 119, 0.2)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                },
              }}
            >
              <AccordionSummary
                expandIcon={
                  <ExpandMoreIcon
                    sx={{ color: "rgba(255,255,255,0.5)", fontSize: 20 }}
                  />
                }
                sx={{
                  px: 2,
                  py: 0.5,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                  minHeight: 56,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "10px",
                      bgcolor: "rgba(85, 255, 119, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(85, 255, 119, 0.2)",
                      color: "#55ff77",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                    }}
                  >
                    {account.provider === "other"
                      ? "🌐"
                      : (account.label || account.provider)
                          ?.charAt(0)
                          .toUpperCase()}
                  </Box>
                  <Typography
                    sx={{
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {account.label ||
                      toTitleCase(account.provider) ||
                      "Payment Method"}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
                {account.accountName && (
                  <AccountDetailItem
                    label="Account Name"
                    value={account.accountName}
                  />
                )}
                <AccountDetailItem
                  label="Account Number / ID"
                  value={account.accountNumber}
                />
                {account.instructions && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "rgba(85, 255, 119, 0.05)",
                      borderRadius: 2,
                      borderLeft: "3px solid #55ff77",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255, 255, 255, 0.8)",
                        display: "block",
                        lineHeight: 1.4,
                      }}
                    >
                      💡 {account.instructions}
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              bgcolor: "rgba(255, 255, 255, 0.02)",
              borderRadius: 3,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              Payment account information is currently unavailable. Please
              contact support.
            </Typography>
          </Box>
        )}
      </Box>


    </Box>
  );
};

export default DepositAccountDetails;
