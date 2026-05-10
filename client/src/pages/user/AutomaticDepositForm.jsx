import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Typography,
} from "@mui/material";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useAppConfig } from "../../contexts/AppConfigContext";
import {
  isAmountAllowed,
  deriveTransactionFields,
} from "../../utils/automaticDepositUtils";
import {
  submitAutomaticDeposit,
  validateAutomaticDeposit,
} from "../../services/automaticDepositService";

// Shared Dialog paper props for consistent theme
const dialogPaperSx = {
  background: "var(--color-bingo-surface)",
  color: "var(--color-bingo-white)",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
  backdropFilter: "blur(20px)",
};

// Shared TextField styling
const themedTextFieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": {
    color: "var(--color-bingo-white)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "var(--color-bingo-yellow)" },
  },
  "& .MuiInputLabel-root": { color: "var(--color-bingo-muted)" },
  "& .MuiInputLabel-root.Mui-focused": { color: "var(--color-bingo-yellow)" },
};

const AutomaticDepositForm = ({
  open,
  onClose,
  amount,
  exchangeRate,
  currencySymbol,
  paymentMethods = [],
}) => {
  const convertedAmount = (amount * exchangeRate).toFixed(2);
  const { config } = useAppConfig();
  const [transactionInput, setTransactionInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [extractedId, setExtractedId] = useState("");

  React.useEffect(() => {
    const automaticMethods = paymentMethods.filter(m => m.depositChannels?.includes("automatic"));
    if (automaticMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(automaticMethods[0].provider.toLowerCase());
    }
  }, [paymentMethods]);

  const minAutomaticAmount =
    config.walletRules?.minAutomaticDepositAmount ??
    config.walletRules?.minDepositAmount ??
    50;

  const handleSubmit = async () => {
    if (!transactionInput.trim()) {
      toast.error("Please enter a valid transaction ID or SMS text");
      return;
    }

    if (!isAmountAllowed(amount, minAutomaticAmount)) {
      toast.error(
        `Minimum amount for automatic deposit is ${minAutomaticAmount} coins`
      );
      return;
    }

    const { transactionId, smsText } = deriveTransactionFields({
      input: transactionInput,
      paymentMethod,
    });

    if (!transactionId && !smsText) {
      toast.error(
        "Could not extract transaction details. Please provide the full SMS or the transaction ID."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const validation = await validateAutomaticDeposit({
        amount,
        transactionId: transactionId || null,
        smsText: smsText || null,
        paymentMethod: paymentMethod.toUpperCase(),
      });

      if (!validation?.ok) {
        setParsed(validation?.parsed || null);
        setExtractedId(validation?.extractedTransactionId || transactionId);
        setConfirmOpen(true);
        toast.error(
          validation?.message ||
            "We could not validate the receipt against our account. Please review and confirm."
        );
        return;
      }

      setParsed(validation.parsed || null);
      setExtractedId(validation.extractedTransactionId || transactionId);
      setConfirmOpen(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Validation failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    const { transactionId, smsText } = deriveTransactionFields({
      input: transactionInput,
      paymentMethod,
    });
    setIsSubmitting(true);
    try {
      const payload = {
        telegramId: user?.telegramId?.toString() || "",
        amount,
        transactionId: transactionId || null,
        smsText: smsText || null,
        paymentMethod: paymentMethod.toUpperCase(),
      };
      const data = await submitAutomaticDeposit(payload);
      if (data.wallet !== undefined) {
        toast.success(
          `Automatic deposit of ${amount} coins processed successfully! New wallet balance: ${data.wallet} coins`
        );
        setConfirmOpen(false);
        onClose();
      } else {
        throw new Error(data.message || "Failed to process automatic deposit");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Submit failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const methodList = paymentMethods
    .filter(m => m.depositChannels?.includes("automatic"))
    .map(m => ({ key: m.provider.toLowerCase(), label: m.provider }));

  return (
    <>
      {/* ─── Main Deposit Dialog ─────────────────────────────────────── */}
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            textAlign: "center",
            color: "var(--color-bingo-white)",
            pt: 3,
            pb: 1,
          }}
        >
          Complete Automatic Deposit
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          <Typography
            sx={{
              color: "var(--color-bingo-muted)",
              fontSize: "0.85rem",
              mb: 1,
            }}
          >
            Select the payment method and enter the transaction ID or the full
            SMS text after depositing {amount} coins.
          </Typography>
          {amount > 0 && (
            <Typography
              sx={{
                color: "var(--color-bingo-green)",
                fontWeight: 700,
                fontSize: "0.9rem",
                mb: 1,
              }}
            >
              Amount to Pay: {convertedAmount} {currencySymbol}
            </Typography>
          )}
          <Typography
            sx={{
              color: "var(--color-bingo-muted)",
              fontSize: "0.75rem",
              mb: 2.5,
              opacity: 0.7,
            }}
          >
            Minimum allowed: {minAutomaticAmount} coins.
          </Typography>

          {/* Payment Method Buttons */}
          <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
            {methodList.map((m) => (
              <Button
                key={m.key}
                onClick={() => setPaymentMethod(m.key)}
                sx={{
                  borderRadius: "12px",
                  px: 2,
                  py: 1,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  border: "1px solid",
                  borderColor:
                    paymentMethod === m.key
                      ? "var(--color-bingo-yellow)"
                      : "rgba(255,255,255,0.1)",
                  background:
                    paymentMethod === m.key
                      ? "rgba(248,213,23,0.15)"
                      : "transparent",
                  color:
                    paymentMethod === m.key
                      ? "var(--color-bingo-yellow)"
                      : "var(--color-bingo-muted)",
                  "&:hover": {
                    background:
                      paymentMethod === m.key
                        ? "rgba(248,213,23,0.2)"
                        : "rgba(255,255,255,0.05)",
                  },
                }}
              >
                {m.label}
              </Button>
            ))}
          </Box>

          <TextField
            label="Transaction ID or SMS Text"
            fullWidth
            value={transactionInput}
            onChange={(e) => setTransactionInput(e.target.value)}
            sx={themedTextFieldSx}
            placeholder={
              paymentMethod === "cbe"
                ? "Paste the CBE slip URL with id=... or the FT... ID, or full SMS"
                : paymentMethod === "telebirr"
                  ? "Paste the Telebirr SMS (it includes 'transaction number is ...')"
                  : paymentMethod === "cbebirr"
                    ? "Enter the 10-digit Transaction ID or paste the full SMS"
                    : paymentMethod === "dashen"
                      ? "Enter the Transaction ID or paste the full Amole/Dashen SMS"
                      : "Paste the Abyssinia slip URL (trx=...) or FT... ID, or full SMS"
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "center", gap: 2 }}>
          <Button
            onClick={onClose}
            sx={{
              color: "var(--color-bingo-muted)",
              fontWeight: 700,
              flex: 1,
              py: 1.5,
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.1)",
              "&:hover": { background: "rgba(255,255,255,0.05)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            sx={{
              background:
                "linear-gradient(135deg, var(--color-bingo-yellow), var(--color-bingo-yellow-dark))",
              color: "#000",
              fontWeight: 800,
              flex: 1,
              py: 1.5,
              borderRadius: "14px",
              boxShadow: "0 6px 20px -4px rgba(248,213,23,0.3)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, var(--color-bingo-yellow-dark), var(--color-bingo-yellow))",
              },
              "&.Mui-disabled": {
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              },
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Submit"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Confirmation Dialog ─────────────────────────────────────── */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            textAlign: "center",
            color: "var(--color-bingo-white)",
            pt: 3,
            pb: 1,
          }}
        >
          Confirm Receipt Details
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3 }}>
          <Typography
            sx={{
              color: "var(--color-bingo-muted)",
              fontSize: "0.85rem",
              mb: 2,
            }}
          >
            Parsed Transaction ID:{" "}
            <Box
              component="span"
              sx={{ color: "var(--color-bingo-white)", fontWeight: 600 }}
            >
              {extractedId || "—"}
            </Box>
          </Typography>
          {parsed ? (
            <Box
              sx={{
                fontSize: "0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {parsed.receiver && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Receiver: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.receiver}</Box>
                </Typography>
              )}
              {parsed.receiverAccount && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Receiver Account: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.receiverAccount}</Box>
                </Typography>
              )}
              {parsed.creditedPartyName && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Credited Name: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.creditedPartyName}</Box>
                </Typography>
              )}
              {parsed.creditedPartyAccountNo && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Credited Account: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.creditedPartyAccountNo}</Box>
                </Typography>
              )}
              {parsed.referenceNo && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Reference: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.referenceNo}</Box>
                </Typography>
              )}
              {parsed.invoiceNo && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Invoice: <Box component="span" sx={{ color: "var(--color-bingo-white)" }}>{parsed.invoiceNo}</Box>
                </Typography>
              )}
              {(parsed.transferredAmount || parsed.settledAmount) && (
                <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}>
                  Amount on Receipt:{" "}
                  <Box component="span" sx={{ color: "var(--color-bingo-green)", fontWeight: 700 }}>
                    {parsed.transferredAmount || parsed.settledAmount}
                  </Box>
                </Typography>
              )}
            </Box>
          ) : (
            <Typography
              sx={{ color: "var(--color-bingo-muted)", fontSize: "0.8rem" }}
            >
              Couldn't parse receipt details. You can still submit, but we may
              reject it if it doesn't match.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, justifyContent: "center", gap: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              color: "var(--color-bingo-muted)",
              fontWeight: 700,
              flex: 1,
              py: 1.5,
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.1)",
              "&:hover": { background: "rgba(255,255,255,0.05)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            sx={{
              background:
                "linear-gradient(135deg, var(--color-bingo-yellow), var(--color-bingo-yellow-dark))",
              color: "#000",
              fontWeight: 800,
              flex: 1,
              py: 1.5,
              borderRadius: "14px",
              boxShadow: "0 6px 20px -4px rgba(248,213,23,0.3)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, var(--color-bingo-yellow-dark), var(--color-bingo-yellow))",
              },
              "&.Mui-disabled": {
                background: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.3)",
              },
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Confirm & Submit"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AutomaticDepositForm;