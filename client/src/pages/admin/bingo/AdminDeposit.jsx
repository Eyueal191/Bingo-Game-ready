import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";

const AdminDeposit = ({ open, onClose, telegramId, receiptId, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const api = useApi();

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }
    if (!transactionId) {
      setMessage("Please enter a transaction ID");
      return;
    }

    try {
      const res = await api.post(`/api/v1/manual-payment/deposit`, {
        telegramId,
        amount: Number(amount),
        receiptId,
        transactionId,
      });
      setMessage(res.data.message);
      setAmount("");
      setTransactionId("");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Deposit failed");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          fontWeight: "bold",
          mb: 2,
        }}
      >
        Deposit to User Wallet
      </DialogTitle>
      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: "background.default",
        }}
      >
        {message && (
          <Alert
            severity={message.includes("success") ? "success" : "error"}
            sx={{ mb: 2 }}
          >
            {message}
          </Alert>
        )}
        <TextField
          label="Amount (Birr)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          sx={{
            mb: 2,
            bgcolor: "background.paper",
            "& .MuiInputBase-root": { borderRadius: 1 },
            "& .MuiInputLabel-root": { color: "text.secondary" },
            "& .MuiInputBase-input": { color: "text.primary" },
          }}
          InputProps={{ sx: { color: "text.primary" } }}
          InputLabelProps={{ sx: { color: "text.secondary" } }}
        />
        <TextField
          label="Transaction ID"
          type="text"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          fullWidth
          sx={{
            mb: 2,
            bgcolor: "background.paper",
            "& .MuiInputBase-root": { borderRadius: 1 },
            "& .MuiInputLabel-root": { color: "text.secondary" },
            "& .MuiInputBase-input": { color: "text.primary" },
          }}
          InputProps={{ sx: { color: "text.primary" } }}
          InputLabelProps={{ sx: { color: "text.secondary" } }}
        />
      </DialogContent>
      <DialogActions
        sx={{
          p: { xs: 1, sm: 2 },
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button onClick={onClose} sx={{ color: "error.main" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleDeposit}
          sx={{
            bgcolor: "success.main",
            "&:hover": { bgcolor: "success.dark" },
            color: "white",
            minWidth: 100,
          }}
        >
          Deposit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminDeposit;
