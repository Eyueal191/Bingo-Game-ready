import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";

const AgentPaymentModal = ({
  open,
  onClose,
  onPayment,
  loading,
  agentName,
}) => {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) return;
    try {
      await onPayment({ amount: parseFloat(amount), notes });
      onClose(); // Close modal on success
      setAmount("");
      setNotes("");
    } catch {
      // Error is handled in the parent component
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Make Payment to {agentName}
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Notes (Optional)"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : "Submit Payment"}
          </Button>
        </form>
      </Box>
    </Modal>
  );
};

export default AgentPaymentModal;
