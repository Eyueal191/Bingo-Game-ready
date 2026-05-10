import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Modal,
} from "@mui/material";
import api from "../../../../services/apiClient";

function AddBonusForm({ open, onClose }) {

  const [form, setForm] = useState({
    amount: "",
    bonusType: "manual_bonus",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // ✅ NO IDs SENT AT ALL
      const res = await api.post("/api/v1/bonus/add", {
        amount: Number(form.amount),
        bonusType: form.bonusType,
        description: form.description,
      });

      setMessage(res.data.message || "Bonus added successfully");

      setForm({
        amount: "",
        bonusType: "manual_bonus",
        description: "",
      });

      setTimeout(() => {
        onClose();
      }, 800);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to add bonus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          width: 420,
          p: 3,
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Add Bonus
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>

          {/* AMOUNT */}
          <TextField
            fullWidth
            label="Amount"
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            margin="normal"
            required
          />

          {/* BONUS TYPE */}
          <TextField
            select
            fullWidth
            label="Bonus Type"
            name="bonusType"
            value={form.bonusType}
            onChange={handleChange}
            margin="normal"
          >
            <MenuItem value="manual_bonus">Manual Bonus</MenuItem>
            <MenuItem value="registration_bonus">Registration Bonus</MenuItem>
            <MenuItem value="referral_bonus">Referral Bonus</MenuItem>
            <MenuItem value="deposit_bonus">Deposit Bonus</MenuItem>
            <MenuItem value="compensation_bonus">Compensation Bonus</MenuItem>
            <MenuItem value="correction_bonus">Correction Bonus</MenuItem>
          </TextField>

          {/* DESCRIPTION */}
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={2}
          />

          {/* ACTIONS */}
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button fullWidth variant="outlined" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                "Add Bonus"
              )}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}

export default AddBonusForm;