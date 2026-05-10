// pages/user/AutomaticDepositForm.jsx
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

const AutomaticDepositForm = ({ open, onClose, amount }) => {
  const { config } = useAppConfig();
  const [transactionInput, setTransactionInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const methods = config?.botPayments?.deposit?.methods || {};
  
  const paymentMethodOptions = [
    { id: "cbe", label: "CBE" },
    { id: "telebirr", label: "Telebirr" },
    { id: "abyssinia", label: "Abyssinia" },
    { id: "cbebirr", label: "CBE Birr" },
    { id: "dashen", label: "Dashen" },
  ].filter(m => methods[m.id]);

  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethodOptions.length > 0 ? paymentMethodOptions[0].id : "cbe"
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [extractedId, setExtractedId] = useState("");

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
        `Minimum amount for automatic deposit is ${minAutomaticAmount} ETB`
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

    // Pre-validate with backend parsers for parity with bot
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
          `Automatic deposit of ${amount} ETB processed successfully! New wallet balance: ${data.wallet} ETB`
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

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle >
          Complete Automatic Deposit
        </DialogTitle>
  <DialogContent >
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please select the payment method and enter the transaction ID or the
            full SMS text after depositing {amount} ETB. Minimum allowed amount:
            {" "}
            {minAutomaticAmount} ETB.
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", justifyContent: "center" }}>
            {paymentMethodOptions.length === 0 ? (
               <Typography variant="body2" color="error">No automatic payment methods are enabled.</Typography>
            ) : (
               paymentMethodOptions.map((m) => (
                 <Button
                   key={m.id}
                   variant={paymentMethod === m.id ? "contained" : "outlined"}
                   onClick={() => setPaymentMethod(m.id)}
                   sx={{
                     bgcolor: paymentMethod === m.id ? "#1e88e5" : "transparent",
                     color: paymentMethod === m.id ? "white" : "rgba(255,255,255,0.7)",
                     borderColor: "rgba(255,255,255,0.3)",
                     "&:hover": {
                       borderColor: "white",
                     }
                   }}
                 >
                   {m.label}
                 </Button>
               ))
            )}
          </Box>

      <TextField
            label="Transaction ID or SMS Text"
            fullWidth
            value={transactionInput}
            onChange={(e) => setTransactionInput(e.target.value)}
            sx={{
              mb: 2,
        "& .MuiInputBase-input": { color: "text.primary" },
        "& .MuiInputLabel-root": { color: "text.secondary" },
            }}
            placeholder={
              paymentMethod === "telebirr"
               ? "Paste the Telebirr SMS (it includes 'transaction number is ...')"
               : "Paste the receipt URL or full SMS"
            }
          />
        </DialogContent>
        <DialogActions >
          <Button onClick={onClose} sx={{ bgcolor:"#fe0000"  ,color: "white" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
            sx={{ bgcolor: "#1e88e5", color: "white" }}
          >
            {isSubmitting ? <CircularProgress size={24} /> : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
      >
        <DialogTitle>Confirm Receipt Details</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Parsed Transaction ID: {extractedId || "-"}
          </Typography>
          {parsed ? (
            <Box sx={{ fontSize: 14 }}>
              {parsed.receiver && <div>Receiver: {parsed.receiver}</div>}
              {parsed.receiverAccount && (
                <div>Receiver Account: {parsed.receiverAccount}</div>
              )}
              {parsed.creditedPartyName && (
                <div>Credited Name: {parsed.creditedPartyName}</div>
              )}
              {parsed.creditedPartyAccountNo && (
                <div>Credited Account: {parsed.creditedPartyAccountNo}</div>
              )}
              {parsed.referenceNo && <div>Reference: {parsed.referenceNo}</div>}
              {parsed.invoiceNo && <div>Invoice: {parsed.invoiceNo}</div>}
              {parsed.transferredAmount && (
                <div>Amount on Receipt: {parsed.transferredAmount}</div>
              )}
              {parsed.settledAmount && (
                <div>Amount on Receipt: {parsed.settledAmount}</div>
              )}
            </Box>
          ) : (
            <Typography variant="body2">
              Couldn’t parse receipt details. You can still submit, but we may
              reject it if it doesn’t match.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AutomaticDepositForm;