import  { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  InputLabel,
  Grid,
  CircularProgress,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";
import {  toast } from "sonner";

const AdminNotifications = () => {
  const api = useApi();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    header: "",
    descriptionAbove: "",
  });
  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setFileName(file.name);
    }
  };

  const handleSendNotification = async () => {
    if (!formData.description && !image && !formData.descriptionAbove) {
      toast.error(
        "Please provide a message for above or below the image, or upload an image."
      );
      return;
    }
    if (
      formData.amount &&
      (isNaN(formData.amount) || Number(formData.amount) <= 0)
    ) {
      toast.error("Please enter a valid positive amount.");
      return;
    }

    setIsSending(true);
    const data = new FormData();
    data.append("description", formData.description);
    data.append("descriptionAbove", formData.descriptionAbove);
    if (formData.amount) data.append("amount", Number(formData.amount));
    if (formData.header) data.append("header", formData.header);
    if (image) data.append("image", image);

    try {
      await api.post(`/api/v1/send-user-notice/notify`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Notification sent successfully!");
      setFormData({
        description: "",
        amount: "",
        header: "",
        descriptionAbove: "",
      });
      setImage(null);
      setFileName("");
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to send notification."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: "background.default",
        maxWidth: 800,
        mx: "auto",
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{
          color: "primary.main",
          mb: 3,
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Send Notification to Players
      </Typography>

      <Box
        component="form"
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Header (Optional)"
              name="header"
              value={formData.header}
              onChange={handleInputChange}
              fullWidth
              sx={{ bgcolor: "background.paper" }}
              InputLabelProps={{ sx: { color: "text.secondary" } }}
              helperText="A title for your notification."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Text Above Image (Optional)"
              name="descriptionAbove"
              value={formData.descriptionAbove}
              onChange={handleInputChange}
              multiline
              rows={3}
              fullWidth
              sx={{ bgcolor: "background.paper" }}
              InputLabelProps={{ sx: { color: "text.secondary" } }}
              helperText="This text will appear above the image."
            />
          </Grid>
          <Grid item xs={12}>
            <Box>
              <InputLabel sx={{ color: "text.secondary", mb: 1 }}>
                Upload Image (Optional)
              </InputLabel>
              <Button
                variant="contained"
                component="label"
                fullWidth
                disabled={isSending}
              >
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </Button>
              {fileName && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: "text.secondary" }}
                >
                  Selected: {fileName}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Text Below Image / Main Message"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={5}
              fullWidth
              sx={{ bgcolor: "background.paper" }}
              InputLabelProps={{ sx: { color: "text.secondary" } }}
              helperText="This text appears below the image or as the main message if no image is uploaded."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Stake Amount (Optional)"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              fullWidth
              sx={{ bgcolor: "background.paper" }}
              InputLabelProps={{ sx: { color: "text.secondary" } }}
              helperText="Links to a game room if a matching stake exists."
            />
          </Grid>
        </Grid>
        <Button
          variant="contained"
          onClick={handleSendNotification}
          size="large"
          disabled={isSending}
          sx={{
            bgcolor: "success.main",
            "&:hover": { bgcolor: "success.dark" },
            color: "white",
            mt: 2,
            py: 1.5,
            fontWeight: "bold",
          }}
        >
          {isSending ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Send Notification"
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default AdminNotifications;
