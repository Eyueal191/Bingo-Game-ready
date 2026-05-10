import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
} from "@mui/material";
import { useAuth } from "../../../contexts/AuthContext";
import { useWallet } from "../../../contexts/WalletContext";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useApi } from "../../../contexts/ApiContext";

const AdminProfileModal = ({ open, onOpenChange }) => {
  const { user, logout } = useAuth();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const [username, setUsername] = useState(
    user?.fullName || user?.telegramId || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [referralCode, setReferralCode] = useState(user?.referralCode || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user) {
      setUsername(user.fullName || user.telegramId || "");
      setPhoneNumber(user.phone || "");
      setReferralCode(user.referralCode || "");
    }
  }, [user]);

  const api = useApi();

  const handleUpdate = async () => {
    try {
      await api.put(`/api/v1/auth/profile`, { fullName: username });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    try {
      await api.put(`/api/v1/auth/change-password`, {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard");
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    navigate("/login");
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        maxWidth="md"
        fullWidth
        sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
      >
        <DialogContent
          sx={{
            p: 0,
            bgcolor: "background.paper",
            color: "text.primary",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" }, // Stack on mobile
              minHeight: { xs: "auto", md: "500px" },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: { xs: 1, sm: 2 },
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: { xs: "flex", md: "none" }, // Show only on mobile
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                Settings
              </Typography>
              <IconButton
                onClick={() => onOpenChange(false)}
                sx={{
                  color: "text.primary",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Sidebar */}
            <Box
              sx={{
                width: { xs: "100%", md: 200 },
                borderRight: { xs: "none", md: "1px solid" },
                borderBottom: { xs: "1px solid", md: "none" },
                borderColor: "divider",
                display: "flex",
                flexDirection: { xs: "row", md: "column" }, // Row on mobile, column on desktop
                bgcolor: "background.paper",
                overflowX: { xs: "auto", md: "hidden" },
              }}
            >
              <Box
                sx={{
                  p: { xs: 1, md: 2 },
                  borderBottom: { xs: "none", md: "1px solid" },
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  display: { xs: "none", md: "flex" }, // Show header only on desktop
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "text.primary" }}
                >
                  Settings
                </Typography>
                <IconButton
                  onClick={() => onOpenChange(false)}
                  sx={{
                    color: "text.primary",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              <Button
                fullWidth
                sx={{
                  justifyContent: { xs: "center", md: "flex-start" },
                  py: { xs: 1, md: 2 },
                  px: { xs: 2, md: 3 },
                  color: "text.primary",
                  bgcolor: "primary.main",
                  borderLeft: { xs: "none", md: "4px solid" },
                  borderBottom: { xs: "4px solid", md: "none" },
                  borderColor: "primary.light",
                  "&:hover": { bgcolor: "primary.light", color: "white" },
                  minWidth: { xs: 100, md: "auto" },
                }}
              >
                <PersonIcon sx={{ mr: { xs: 0, md: 1 }, fontSize: 18 }} />
                <Typography sx={{ display: { xs: "none", md: "block" } }}>
                  Profile
                </Typography>
              </Button>
              <Button
                fullWidth
                onClick={handleLogout}
                sx={{
                  justifyContent: { xs: "center", md: "flex-start" },
                  py: { xs: 1, md: 2 },
                  px: { xs: 2, md: 3 },
                  color: "error.main",
                  "&:hover": { bgcolor: "action.hover" },
                  minWidth: { xs: 100, md: "auto" },
                }}
              >
                <LogoutIcon sx={{ mr: { xs: 0, md: 1 }, fontSize: 18 }} />
                <Typography sx={{ display: { xs: "none", md: "block" } }}>
                  Log Out
                </Typography>
              </Button>
            </Box>

            {/* Content Area */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 2, sm: 3 },
                bgcolor: "background.default",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    User Name
                  </Typography>
                  <TextField
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      "& .MuiInputBase-input": { color: "text.primary" },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    Phone Number
                  </Typography>
                  <TextField
                    fullWidth
                    value={phoneNumber}
                    disabled
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      "& .MuiInputBase-input": { color: "text.primary" },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    Balance
                  </Typography>
                  <TextField
                    fullWidth
                    value={wallet ? `${wallet.toLocaleString()} ETB` : "0 ETB"}
                    disabled
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 1,
                      "& .MuiInputBase-input": { color: "text.primary" },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "divider",
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    Referral Code
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      fullWidth
                      value={referralCode}
                      disabled
                      sx={{
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        "& .MuiInputBase-input": { color: "text.primary" },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "divider",
                        },
                      }}
                    />
                    <Button
                      onClick={handleCopyLink}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.light" },
                      }}
                    >
                      <ContentCopyIcon sx={{ mr: 1, fontSize: 16 }} />
                      Copy
                    </Button>
                  </Box>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      mb: 1,
                      color: "text.secondary",
                    }}
                  >
                    Change Password
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <TextField
                      fullWidth
                      type="password"
                      label="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      sx={{
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        "& .MuiInputBase-input": { color: "text.primary" },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "divider",
                        },
                        "& .MuiInputLabel-root": { color: "text.secondary" },
                      }}
                    />
                    <TextField
                      fullWidth
                      type="password"
                      label="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      sx={{
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        "& .MuiInputBase-input": { color: "text.primary" },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "divider",
                        },
                        "& .MuiInputLabel-root": { color: "text.secondary" },
                      }}
                    />
                    <Button
                      onClick={handleChangePassword}
                      sx={{
                        bgcolor: "primary.main",
                        color: "white",
                        "&:hover": { bgcolor: "primary.light" },
                      }}
                    >
                      Change Password
                    </Button>
                  </Box>
                </Box>
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                >
                  <Button
                    onClick={handleUpdate}
                    sx={{
                      bgcolor: "primary.main",
                      color: "white",
                      "&:hover": { bgcolor: "primary.light" },
                    }}
                  >
                    Save Changes
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <ToastContainer />
    </>
  );
};

export default AdminProfileModal;
