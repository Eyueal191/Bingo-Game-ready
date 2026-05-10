import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Stack,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ShareIcon from "@mui/icons-material/Share";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import { useApi } from "../../contexts/ApiContext";
import { useAppConfig } from "../../contexts/AppConfigContext";

const AGENT_EARNINGS_API = "/api/v1/users/agent/earnings";
const AGENT_PAYMENTS_API = "/api/v1/agent-payments";

const AgentDashboard = () => {
  const api = useApi();
  const { config } = useAppConfig();
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [earningsRes, paymentsRes] = await Promise.all([
          api.get(AGENT_EARNINGS_API),
          api.get(AGENT_PAYMENTS_API),
        ]);

        const earningsData = earningsRes.data;
        const paymentsData = paymentsRes.data.payments || [];

        setStats(earningsData);
        setPayments(paymentsData);

        const totalRevenue = earningsData.totalRevenue || 0;
        const paidAmount = paymentsData.reduce((acc, p) => acc + p.amount, 0);

        setTotalPaid(paidAmount);
        setRemainingBalance(totalRevenue - paidAmount);
      } catch (error) {
        console.error(error);
        setSnackbar({
          open: true,
          message: "Failed to load dashboard data",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const appName = config.identity?.appName || "";
  const botUserName = config.bot?.botUserName;
  const referralCode = stats?.referralCode || "";
  const shareText = `Join ${appName} with my referral code: ${referralCode}`;
  const shareUrl = botUserName
    ? `https://t.me/${botUserName}?start=${referralCode}`
    : referralCode;
  const handleCopy = () => {
  navigator.clipboard.writeText(shareUrl);
    setSnackbar({
      open: true,
      message: "Referral code copied!",
      severity: "success",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: appName,
        text: shareText,
        url: botUserName ? shareUrl : window.location.origin,
      });
    } else {
      setSnackbar({
        open: true,
        message: "Sharing not supported on this device",
        severity: "info",
      });
    }
  };

  const handleWhatsAppShare = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${shareText} ${botUserName ? shareUrl : ""}`.trim()
      )}`
    );
  };

  const handleTelegramShare = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(
        botUserName ? shareUrl : ""
      )}&text=${encodeURIComponent(shareText)}`
    );
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (!stats)
    return (
      <Typography color="error">Failed to load agent dashboard.</Typography>
    );

  return (
    <Box sx={{ p: { xs: 1, sm: 3 } }}>
      <Typography
        variant="h4"
        gutterBottom
        fontWeight={900}
        sx={{ textShadow: "0 2px 8px #000a" }}
      >
        Agent Dashboard
      </Typography>
      <Card
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          p: 2,
          boxShadow: 8,
          borderRadius: 4,
          background: "linear-gradient(120deg, #23232b 80%, #3a3a4a 100%)",
        }}
      >
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" color="#FFD600">
            click to copy referal link (Your Referral Code) :
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", letterSpacing: 2, color: "#fff" }}
            >
              {stats.referralCode}
            </Typography>
            <Tooltip title="Copy">
              <IconButton onClick={handleCopy} color="primary">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share">
              <IconButton onClick={handleShare} color="primary">
                <ShareIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share via WhatsApp">
              <IconButton onClick={handleWhatsAppShare} color="success">
                <WhatsAppIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share via Telegram">
              <IconButton onClick={handleTelegramShare} color="info">
                <TelegramIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card
          sx={{
            flex: 1,
            minWidth: 220,
            boxShadow: 8,
            borderRadius: 4,
            background: "linear-gradient(120deg, #1e88e5 60%, #1565c0 100%)",
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" color="#FFD600">
              Total Revenue
            </Typography>
            <Typography variant="h5" color="#fff" fontWeight={900}>
              {stats.totalRevenue} Birr
            </Typography>
          </CardContent>
        </Card>
        <Card
          sx={{
            flex: 1,
            minWidth: 220,
            boxShadow: 8,
            borderRadius: 4,
            background: "linear-gradient(120deg, #ff7e5f 60%, #feb47b 100%)",
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" color="#23232b">
              Total Paid
            </Typography>
            <Typography variant="h5" color="#fff" fontWeight={900}>
              {totalPaid.toLocaleString()} Birr
            </Typography>
          </CardContent>
        </Card>
        <Card
          sx={{
            flex: 1,
            minWidth: 220,
            boxShadow: 8,
            borderRadius: 4,
            background: "linear-gradient(120deg, #43e97b 60%, #38f9d7 100%)",
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" color="#23232b">
              Remaining Balance
            </Typography>
            <Typography variant="h5" color="#23232b" fontWeight={900}>
              {remainingBalance.toLocaleString()} Birr
            </Typography>
          </CardContent>
        </Card>
        <Card
          sx={{
            flex: 1,
            minWidth: 220,
            boxShadow: 8,
            borderRadius: 4,
            background: "linear-gradient(120deg, #43e97b 60%, #38f9d7 100%)",
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" color="#23232b">
              Total Games Played
            </Typography>
            <Typography variant="h5" color="#23232b" fontWeight={900}>
              {stats.totalGames}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      <Typography variant="h6" gutterBottom fontWeight={700} color="#FFD600">
        Referred Users
      </Typography>
      <Paper sx={{ boxShadow: 8, borderRadius: 4, overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "#23232b",
                  background: "#FFD600",
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "#23232b",
                  background: "#FFD600",
                }}
              >
                Phone
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: "#23232b",
                  background: "#FFD600",
                }}
              >
                Registered At
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.referredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No users registered with your referral code yet.
                </TableCell>
              </TableRow>
            ) : (
              stats.referredUsers.map((user, idx) => (
                <TableRow key={idx}>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Typography
        variant="h6"
        gutterBottom
        fontWeight={700}
        color="#FFD600"
        sx={{ mt: 4 }}
      >
        Payment History
      </Typography>
      <Paper sx={{ boxShadow: 8, borderRadius: 4, overflow: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  background: "#FFD600",
                }}
              >
                Date
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  background: "#FFD600",
                }}
              >
                Amount
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  background: "#FFD600",
                }}
              >
                Notes
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment._id}>
                <TableCell>
                  {new Date(payment.transactionDate).toLocaleString()}
                </TableCell>
                <TableCell>{payment.amount.toLocaleString()} Birr</TableCell>
                <TableCell>{payment.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AgentDashboard;
