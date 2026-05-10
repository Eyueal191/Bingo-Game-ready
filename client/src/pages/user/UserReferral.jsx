import React, { useState, useEffect } from "react";
import {
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Person as UserIcon,
  People as UsersIcon,
  MonetizationOn as DollarSignIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/ApiContext";
import { useAppConfig } from "../../contexts/AppConfigContext";
import GlassCard from "../../components/common/GlassCard";

const UserReferral = () => {
  const { token, user } = useAuth();
  const { config } = useAppConfig();
  const [referralCode] = useState(user.referralCode);
  const botUserName = config?.bot?.botUserName || "";
  const baseBotLink = botUserName ? `https://t.me/${botUserName}` : "";
  const referralLink = baseBotLink
    ? `${baseBotLink}${
        referralCode ? `?start=${encodeURIComponent(referralCode)}` : ""
      }`
    : "";
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!token) return;
      try {
        const data = await api.get("/api/v1/manual-payment/referral-income", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReferralData(data);
        setLoading(false);
      } catch (error) {
        toast.error("Failed to load referral data");
        setLoading(false);
      }
    };
    fetchReferralData();
  }, [token, api]);

  const handleCopyLink = () => {
    if (!referralLink) {
      toast.error("Referral link unavailable. Please try again later.");
      return;
    }
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bingo-bg)",
        }}
      >
        <CircularProgress sx={{ color: "var(--color-bingo-accent)" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: { xs: 12, md: 4 },
        pt: 4,
        px: { xs: 1.5, sm: 2 },
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 900 }}>
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: "var(--color-txt-main)",
              mb: 1,
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            {config?.identity?.appName || "Referral Program"} Referral Program
          </Typography>
          <Typography
            sx={{
              color: "var(--color-txt-muted)",
              fontSize: "1rem",
            }}
          >
            Invite friends to play {config?.identity?.shortName || "with us"} and
            earn bonuses on their first deposit!
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
            gap: 3,
          }}
        >
          {/* Left Column */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Referral Link Card */}
            <GlassCard>
              <Box sx={{ p: 3 }}>
                <Typography
                  sx={{
                    color: "var(--color-txt-main)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  Your Referral Link
                </Typography>
                <Typography
                  sx={{
                    color: "var(--color-txt-muted)",
                    fontSize: "0.85rem",
                    mb: 3,
                  }}
                >
                  Share this link with your friends to earn bonuses
                </Typography>

                <Box sx={{ display: "flex", gap: 1.5, mb: 2 }}>
                  <TextField
                    fullWidth
                    value={referralLink}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "var(--color-bingo-surface)",
                        color: "var(--color-txt-main)",
                        "& fieldset": { borderColor: "var(--color-bingo-border)" },
                        "&:hover fieldset": {
                          borderColor: "var(--color-bingo-border-strong)",
                        },
                      },
                    }}
                  />
                  <Button
                    onClick={handleCopyLink}
                    startIcon={<CopyIcon />}
                    sx={{
                      background: "var(--gradient-gold)",
                      color: "var(--color-txt-black)",
                      fontWeight: 800,
                      borderRadius: "12px",
                      px: 3,
                      whiteSpace: "nowrap",
                      textTransform: "none",
                      boxShadow: "var(--shadow-glow-gold)",
                      "&:hover": {
                        filter: "brightness(1.1)",
                      },
                    }}
                  >
                    Copy Link
                  </Button>
                </Box>
                <Typography
                  sx={{
                    color: "var(--color-txt-muted)",
                    fontSize: "0.8rem",
                  }}
                >
                  You earn 10% of your referrals' first deposit when they join{" "}
                  {config?.identity?.shortName || "the game"}
                </Typography>
              </Box>
            </GlassCard>

            {/* Referral History Card */}
            <GlassCard>
              <Box sx={{ p: 3 }}>
                <Typography
                  sx={{
                    color: "var(--color-txt-main)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  Referral History
                </Typography>
                <Typography
                  sx={{
                    color: "var(--color-txt-muted)",
                    fontSize: "0.85rem",
                    mb: 2,
                  }}
                >
                  Track your referral activity and earnings
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            color: "var(--color-txt-muted)",
                            borderBottom: "1px solid var(--color-bingo-border)",
                            fontWeight: 600,
                          }}
                        >
                          Username
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "var(--color-txt-muted)",
                            borderBottom: "1px solid var(--color-bingo-border)",
                            fontWeight: 600,
                          }}
                        >
                          Date
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "var(--color-txt-muted)",
                            borderBottom: "1px solid var(--color-bingo-border)",
                            fontWeight: 600,
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: "var(--color-txt-muted)",
                            borderBottom: "1px solid var(--color-bingo-border)",
                            fontWeight: 600,
                          }}
                        >
                          Earnings
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {referralData?.recentReferrals?.length > 0 ? (
                        referralData.recentReferrals.map((referral) => (
                          <TableRow
                            key={referral.id}
                            sx={{
                              "&:hover": {
                                backgroundColor: "var(--color-bingo-card-alt)",
                              },
                            }}
                          >
                            <TableCell
                              sx={{
                                color: "var(--color-txt-main)",
                                borderBottom:
                                  "1px solid var(--color-bingo-border)",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <UserIcon
                                sx={{ color: "var(--color-bingo-accent)", fontSize: 18 }}
                              />
                              {referral.username}
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "var(--color-txt-main)",
                                borderBottom:
                                  "1px solid var(--color-bingo-border)",
                              }}
                            >
                              {referral.date}
                            </TableCell>
                            <TableCell
                              sx={{
                                borderBottom:
                                  "1px solid var(--color-bingo-border)",
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  backgroundColor:
                                    referral.status === "active"
                                      ? "hsla(155, 90%, 45%, 0.15)"
                                      : "hsla(42, 95%, 52%, 0.15)",
                                  color:
                                    referral.status === "active"
                                      ? "var(--color-bingo-secondary)"
                                      : "var(--color-bingo-accent)",
                                }}
                              >
                                {referral.status.charAt(0).toUpperCase() +
                                  referral.status.slice(1)}
                              </Box>
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                color: "var(--color-txt-main)",
                                borderBottom:
                                  "1px solid var(--color-bingo-border)",
                                fontWeight: 700,
                              }}
                            >
                              {parseFloat(referral.earnings) > 0
                                ? `ETB ${referral.earnings}`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            align="center"
                            sx={{
                              py: 4,
                              color: "var(--color-txt-muted)",
                              borderBottom:
                                "1px solid var(--color-bingo-border)",
                            }}
                          >
                            No recent referrals found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </GlassCard>
          </Box>

          {/* Right Column */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Stats Card */}
            <GlassCard>
              <Box sx={{ p: 3 }}>
                <Typography
                  sx={{
                    color: "var(--color-txt-main)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    mb: 2,
                  }}
                >
                  Referral Stats
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      backgroundColor: "var(--color-bingo-surface)",
                      borderRadius: "16px",
                      border: "1px solid var(--color-bingo-border)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "hsla(42, 95%, 52%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <UsersIcon sx={{ color: "var(--color-bingo-accent)" }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.8rem" }}>
                        Total Invites
                      </Typography>
                      <Typography
                        sx={{
                          color: "var(--color-txt-main)",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                        }}
                      >
                        {referralData?.totalInvites || 0}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      backgroundColor: "var(--color-bingo-surface)",
                      borderRadius: "16px",
                      border: "1px solid var(--color-bingo-border)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "hsla(155, 90%, 45%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <UserIcon sx={{ color: "var(--color-bingo-secondary)" }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.8rem" }}>
                        Active Invites
                      </Typography>
                      <Typography
                        sx={{
                          color: "var(--color-txt-main)",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                        }}
                      >
                        {referralData?.activeInvites || 0}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      backgroundColor: "var(--color-bingo-surface)",
                      borderRadius: "16px",
                      border: "1px solid var(--color-bingo-border)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "hsla(42, 95%, 52%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                      }}
                    >
                      <DollarSignIcon sx={{ color: "var(--color-bingo-accent)" }} />
                    </Box>
                    <Box>
                      <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.8rem" }}>
                        Total Earnings
                      </Typography>
                      <Typography
                        sx={{
                          color: "var(--color-txt-main)",
                          fontSize: "1.5rem",
                          fontWeight: 800,
                        }}
                      >
                        ETB {referralData?.totalEarnings || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </GlassCard>

            {/* How It Works Card */}
            <GlassCard>
              <Box sx={{ p: 3 }}>
                <Typography
                  sx={{
                    color: "var(--color-txt-main)",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    mb: 3,
                  }}
                >
                  How It Works
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "hsla(42, 95%, 52%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ color: "var(--color-bingo-accent)", fontWeight: 700 }}>
                        1
                      </Typography>
                    </Box>
                    <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.9rem" }}>
                      Share your referral link with friends
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "hsla(42, 95%, 52%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ color: "var(--color-bingo-accent)", fontWeight: 700 }}>
                        2
                      </Typography>
                    </Box>
                    <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.9rem" }}>
                      Your friends sign up and make a deposit
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "hsla(42, 95%, 52%, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mr: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ color: "var(--color-bingo-accent)", fontWeight: 700 }}>
                        3
                      </Typography>
                    </Box>
                    <Typography sx={{ color: "var(--color-txt-muted)", fontSize: "0.9rem" }}>
                      You earn 10% of their first deposit
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default UserReferral;
