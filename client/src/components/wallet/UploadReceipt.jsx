// pages/user/UploadReceipt.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Input,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useApi } from "../../contexts/ApiContext";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import toast, { Toaster } from "react-hot-toast";

const UploadReceipt = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file");

    const formData = new FormData();
    formData.append("receipt", file);

    setLoading(true);

    try {
      const res = await api.post(`/api/v1/manual-payment/receipt`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "white", // Match dashboard card style
        borderRadius: 2,
        boxShadow: 2,
        textAlign: "center",
        width: "100%", // Responsive width
        maxWidth: 600, // Consistent with WithdrawRequest
      }}
    >
      <Toaster />
      <Typography variant="h6" sx={{ color: "#000", mb: 2 }}>
        Upload Payment Receipt
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5", // Slightly different background for the upload area
          borderRadius: 1,
          p: 2,
          mb: 2,
          cursor: "pointer",
          border: "2px dashed #ccc",
        }}
        component="label"
      >
        <UploadFileIcon sx={{ mr: 1 }} />
        <Typography variant="body2" sx={{ color: "#333" }}>
          {file ? file.name : "Select a file or image"}
        </Typography>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          sx={{ display: "none" }}
        />
      </Box>
      <Button
        variant="contained"
        onClick={handleUpload}
        fullWidth
        sx={{ py: 1.5, backgroundColor: "#1e88e5", color: "#fff" }}
        disabled={loading}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: "#fff" }} />
        ) : (
          "Upload"
        )}
      </Button>
    </Box>
  );
};

export default UploadReceipt;
