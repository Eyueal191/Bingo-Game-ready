import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Alert,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";

const AdminWithdrawalApproval = ({
  open,
  onClose,
  telegramId,
  withdrawalId,
  amount,
  onSuccess,
}) => {
  const [message, setMessage] = useState(null);
  const api = useApi();

  const handleApprove = async () => {
    try {
      const res = await api.post(`/api/v1/withdrawal/approve`, {
        telegramId,
        withdrawalId,
        amount,
      });
      setMessage(res.data.message);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.message || "Approval failed");
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
        }}
      >
        Approve Withdrawal
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
        <Typography sx={{ mb: 2, color: "text.primary" }}>
          Approve withdrawal of {amount} Birr for user {telegramId}?
        </Typography>
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
          onClick={handleApprove}
          sx={{
            bgcolor: "success.main",
            "&:hover": { bgcolor: "success.dark" },
            color: "white",
            minWidth: 100,
          }}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminWithdrawalApproval;
