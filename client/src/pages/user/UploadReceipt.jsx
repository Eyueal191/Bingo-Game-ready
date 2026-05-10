import React, { useState } from "react";
import {
  Box,
  Button,
  Input,
  Typography,
  CircularProgress,
  TextField,
  FormControl,
  MenuItem,
} from "@mui/material";
import { useApi } from "../../contexts/ApiContext";
import { useAuth } from "../../contexts/AuthContext";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import toast from "react-hot-toast";

const UploadReceipt = ({ amount, paymentMethods = [], onSuccess }) => {
  const [file, setFile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const api = useApi();
  const { user } = useAuth();

  const activeMethods = paymentMethods
    .filter((a) => a && a.isActive !== false)
    .map((a) => ({ label: a.label || a.provider, value: a.provider }));

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file");
    if (!amount || Number(amount) <= 0)
      return toast.error("Please enter a valid deposit amount above");
    if (!paymentMethod) return toast.error("Please select a payment method");

    const formData = new FormData();
    formData.append("receipt", file);
    formData.append("amount", amount);
    formData.append("paymentMethod", paymentMethod);

    setLoading(true);

    try {
      const res = await api.post(`/api/v1/manual-payment/receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message);
      setFile(null);
      setPaymentMethod("");
      if (onSuccess) {
        onSuccess(res.data.receipt);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mt: { xs: 2, sm: 3 },
        p: { xs: 2, sm: 3 },
        bgcolor: "rgba(255, 255, 255, 0.03)",
        borderRadius: { xs: 3, sm: 4 },
        border: "1px solid rgba(255, 255, 255, 0.08)",
        textAlign: "center",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: "white",
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: "1rem", sm: "1.15rem" },
          fontWeight: 600,
          letterSpacing: "0.5px"
        }}
      >
        Step 2: Upload Payment Receipt
      </Typography>

      <FormControl fullWidth sx={{ mb: { xs: 2, sm: 3 } }}>
        <TextField
          select
          label="Which account did you send to?"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          required
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.04)",
            borderRadius: 2,
            "& .MuiInputBase-input": { color: "white", py: 1.5, fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.6)", fontSize: { xs: "0.9rem", sm: "1rem" } },
            "& .MuiOutlinedInput-notchedOutline": { border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 2 },
            "&:hover .MuiOutlinedInput-notchedOutline": { border: "1px solid rgba(255, 255, 255, 0.2)" },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { border: "1px solid #55ff77" },
            "& .MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.7)" },
          }}
        >
          {activeMethods.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </FormControl>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: file
            ? "rgba(85, 255, 119, 0.05)"
            : "rgba(255, 255, 255, 0.02)",
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
          mb: { xs: 2, sm: 3 },
          cursor: "pointer",
          border: `2px dashed ${file ? "#55ff77" : "rgba(255, 255, 255, 0.15)"}`,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            backgroundColor: file ? "rgba(85, 255, 119, 0.08)" : "rgba(255, 255, 255, 0.05)",
            border: `2px dashed ${file ? "#55ff77" : "rgba(255, 255, 255, 0.3)"}`,
          }
        }}
        component="label"
      >
        <UploadFileIcon
          sx={{
            mb: { xs: 1.5, sm: 2 },
            color: file ? "#55ff77" : "rgba(255, 255, 255, 0.5)",
            fontSize: { xs: 32, sm: 40 },
            transition: "color 0.3s ease"
          }}
        />
        <Typography
          variant="body2"
          sx={{
            color: file ? "#55ff77" : "rgba(255, 255, 255, 0.6)",
            fontSize: { xs: "0.85rem", sm: "0.95rem" },
            wordBreak: "break-all",
            px: 2,
            lineHeight: 1.5
          }}
        >
          {file ? file.name : "Tap to browse image or PDF"}
        </Typography>
        <Input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setFile(e.target.files[0]);
            }
          }}
          sx={{ display: "none" }}
        />
      </Box>
      <Button
        variant="contained"
        onClick={handleUpload}
        fullWidth
        disabled={loading || !file || !paymentMethod || !amount}
        sx={{
          py: { xs: 1.5, sm: 1.8 },
          borderRadius: 2.5,
          textTransform: "none",
          fontSize: { xs: "1rem", sm: "1.05rem" },
          background: "linear-gradient(135deg, #116e51 0%, #0d543e 100%)",
          color: "#ffffff",
          fontWeight: 600,
          boxShadow: (loading || !file || !paymentMethod || !amount) ? "none" : "0 4px 14px rgba(17, 110, 81, 0.4)",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "linear-gradient(135deg, #168a66 0%, #116e51 100%)",
            boxShadow: "0 6px 20px rgba(17, 110, 81, 0.6)",
            transform: "translateY(-1px)",
          },
          "&.Mui-disabled": {
            background: "rgba(255, 255, 255, 0.05)",
            color: "rgba(255, 255, 255, 0.2)",
            boxShadow: "none",
          },
        }}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: "#ffffff" }} />
        ) : (
          "Submit Deposit Request"
        )}
      </Button>
    </Box>
  );
};

export default UploadReceipt;
