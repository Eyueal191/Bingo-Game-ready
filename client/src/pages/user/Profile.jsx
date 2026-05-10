import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import WalletIcon from "@mui/icons-material/Wallet";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-hot-toast";
import { useApi } from "../../contexts/ApiContext";

const ProfileModal = ({ open, onOpenChange }) => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [username, setUsername] = useState(
    user?.fullName || user?.telegramId || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [referralCode, setReferralCode] = useState(user?.referralCode || "");
  const api = useApi();

  useEffect(() => {
    if (user) {
      setUsername(user.fullName || user.telegramId || "");
      setPhoneNumber(user.phone || "");
      setReferralCode(user.referralCode || "");
    }
  }, [user]);

  const handleUpdate = async () => {
    try {
      await api.put(
        "/api/v1/auth/profile",
        { fullName: username },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard");
  };

  const handleNavigation = (option) => {
    onOpenChange(false);
    switch (option) {
      case "wallet":
        // navigate("/wallet");
        navigate("/upload-receipt");

        break;
      case "history":
        navigate("/game-history");
        break;
      case "logout":
        logout();
        navigate("/login");
        break;
      default:
        break;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogContent
        sx={{
          p: 0,
          bgcolor: "#0f1221",
          color: "white",
          border: "1px solid rgba(248, 213, 23, 0.2)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "450px" }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              bgcolor: "#0f1221",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Settings
              </Typography>
              <IconButton
                onClick={() => onOpenChange(false)}
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Main Content */}
          <Box sx={{ display: "flex", flex: 1 }}>
            {/* Sidebar */}
            <Box
              sx={{
                width: 200,
                borderRight: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <Button
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  py: 2,
                  px: 3,
                  color: "white",
                  bgcolor:
                    activeTab === "profile"
                      ? "rgba(248, 213, 23, 0.2)"
                      : "transparent",
                  borderLeft:
                    activeTab === "profile" ? "4px solid #f8d517" : "none",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                }}
                onClick={() => setActiveTab("profile")}
              >
                <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
                Profile
              </Button>
              <Button
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  py: 2,
                  px: 3,
                  color: "white",
                  bgcolor:
                    activeTab === "wallet"
                      ? "rgba(248, 213, 23, 0.2)"
                      : "transparent",
                  borderLeft:
                    activeTab === "wallet" ? "4px solid #f8d517" : "none",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                }}
                onClick={() => handleNavigation("wallet")}
              >
                <WalletIcon sx={{ mr: 1, fontSize: 18 }} />
                Wallet
              </Button>
              <Button
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  py: 2,
                  px: 3,
                  color: "white",
                  bgcolor:
                    activeTab === "history"
                      ? "rgba(248, 213, 23, 0.2)"
                      : "transparent",
                  borderLeft:
                    activeTab === "history" ? "4px solid #f8d517" : "none",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                }}
                onClick={() => handleNavigation("history")}
              >
                <HistoryIcon sx={{ mr: 1, fontSize: 18 }} />
                History
              </Button>
              <Button
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  py: 2,
                  px: 3,
                  color: "#ff3b30",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.05)" },
                }}
                onClick={() => handleNavigation("logout")}
              >
                <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
                Log Out
              </Button>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, p: 3 }}>
              {activeTab === "profile" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.875rem", fontWeight: "medium", mb: 1 }}
                    >
                      User Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      sx={{
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 1,
                        "& .MuiInputBase-input": { color: "white" },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255, 255, 255, 0.2)",
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.875rem", fontWeight: "medium", mb: 1 }}
                    >
                      Phone Number
                    </Typography>
                    <TextField
                      fullWidth
                      value={phoneNumber}
                      InputProps={{ readOnly: true }}
                      sx={{
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 1,
                        "& .MuiInputBase-input": { color: "white" },
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(255, 255, 255, 0.2)",
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.875rem", fontWeight: "medium", mb: 1 }}
                    >
                      Referral Code
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <TextField
                        fullWidth
                        value={referralCode}
                        InputProps={{ readOnly: true }}
                        sx={{
                          bgcolor: "rgba(255, 255, 255, 0.1)",
                          borderRadius: 1,
                          "& .MuiInputBase-input": { color: "white" },
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255, 255, 255, 0.2)",
                          },
                        }}
                      />
                      <Button
                        onClick={handleCopyLink}
                        sx={{
                          bgcolor: "#f8d517",
                          color: "#0f1221",
                          "&:hover": { bgcolor: "rgba(248, 213, 23, 0.9)" },
                        }}
                      >
                        <ContentCopyIcon sx={{ mr: 1, fontSize: 16 }} />
                        Copy
                      </Button>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}
                  >
                    <Button
                      onClick={handleUpdate}
                      sx={{
                        bgcolor: "#f8d517",
                        color: "#0f1221",
                        "&:hover": { bgcolor: "rgba(248, 213, 23, 0.9)" },
                      }}
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
