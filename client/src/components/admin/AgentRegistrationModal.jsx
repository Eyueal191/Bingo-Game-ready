import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Modal,
  Paper,
  TextField,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const style = (theme) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 360,
  bgcolor: theme.palette.background.paper,
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  outline: "none",
});

const AgentRegistrationModal = ({ open, onClose, onRegister, loading }) => {
  const theme = useTheme();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    telegramId: "",
    password: "",
    initialWallet: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.phone || !form.telegramId || !form.password) {
      setError("All fields are required");
      return;
    }
    try {
      await onRegister(form);
      setForm({
        fullName: "",
        phone: "",
        telegramId: "",
        password: "",
        initialWallet: "",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to register agent");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper sx={style(theme)}>
        <Typography variant="h6" mb={2} fontWeight={700} color="primary">
          Register New Agent
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              size="small"
              autoFocus
            />
            <TextField
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              size="small"
            />
            <TextField
              label="Telegram ID"
              name="telegramId"
              value={form.telegramId}
              onChange={handleChange}
              required
              size="small"
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              size="small"
            />
            <TextField
              label="Initial Wallet (optional)"
              name="initialWallet"
              type="number"
              value={form.initialWallet}
              onChange={handleChange}
              size="small"
              helperText="If the agent paid cash at registration"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              Register
            </Button>
          </Stack>
        </form>
      </Paper>
    </Modal>
  );
};

export default AgentRegistrationModal;
