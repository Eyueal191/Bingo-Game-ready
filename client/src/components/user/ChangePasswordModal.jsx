import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { useApi } from "../../contexts/ApiContext";
import { toast } from "sonner";

const ChangePasswordModal = ({ open, onClose }) => {
  const api = useApi();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      return toast.error("Please fill in both password fields");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }
    setLoading(true);
    api
      .put("/api/v1/auth/change-password", passwordData)
      .then(() => {
        toast.success("Password updated successfully!");
        onClose();
        setPasswordData({ currentPassword: "", newPassword: "" });
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to update password");
      })
      .finally(() => setLoading(false));
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      PaperProps={{
        sx: {
          background: "var(--color-bingo-surface)",
          color: "var(--color-bingo-white)",
          borderRadius: "24px",
          border: "1px solid var(--color-bingo-border-strong)",
          boxShadow: "0 24px 48px var(--color-bingo-shadow)",
          backdropFilter: "blur(20px)",
          minWidth: { xs: "90vw", sm: "400px" },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          textAlign: "center",
          pt: 4,
          pb: 1,
          color: "var(--color-bingo-white)",
        }}
      >
        Change Password
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Typography
          sx={{
            color: "var(--color-bingo-muted)",
            fontSize: "0.85rem",
            textAlign: "center",
            mb: 3,
          }}
        >
          Create a strong new password to keep your account secure.
        </Typography>
        <TextField
          fullWidth
          type="password"
          label="Current Password"
          variant="outlined"
          value={passwordData.currentPassword}
          onChange={(e) =>
            setPasswordData({ ...passwordData, currentPassword: e.target.value })
          }
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              color: "var(--color-bingo-white)",
              "& fieldset": { borderColor: "var(--color-bingo-border)" },
              "&:hover fieldset": { borderColor: "var(--color-bingo-border-strong)" },
              "&.Mui-focused fieldset": {
                borderColor: "var(--color-bingo-yellow)",
              },
            },
            "& .MuiInputLabel-root": { color: "var(--color-bingo-muted)" },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "var(--color-bingo-yellow)",
            },
          }}
        />
        <TextField
          fullWidth
          type="password"
          label="New Password"
          variant="outlined"
          value={passwordData.newPassword}
          onChange={(e) =>
            setPasswordData({ ...passwordData, newPassword: e.target.value })
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              color: "var(--color-bingo-white)",
              "& fieldset": { borderColor: "var(--color-bingo-border)" },
              "&:hover fieldset": { borderColor: "var(--color-bingo-border-strong)" },
              "&.Mui-focused fieldset": {
                borderColor: "var(--color-bingo-yellow)",
              },
            },
            "& .MuiInputLabel-root": { color: "var(--color-bingo-muted)" },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "var(--color-bingo-yellow)",
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0, justifyContent: "center", gap: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: "var(--color-bingo-muted)",
            fontWeight: 700,
            flex: 1,
            py: 1.5,
            borderRadius: "14px",
            border: "1px solid var(--color-bingo-border)",
            "&:hover": { background: "var(--color-bingo-card-alt)" },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleChange}
          disabled={loading}
          sx={{
            background: "var(--gradient-gold)",
            color: "var(--color-txt-black)",
            fontWeight: 800,
            flex: 1,
            py: 1.5,
            borderRadius: "14px",
            boxShadow: "var(--shadow-glow-gold)",
            "&:hover": {
              filter: "brightness(1.1)",
            },
            "&.Mui-disabled": {
              background: "var(--color-bingo-border-strong)",
              color: "var(--color-bingo-muted)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordModal;