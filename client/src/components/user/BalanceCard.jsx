import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  AccountBalanceWallet,
  CardGiftcard,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useWallet } from "../../contexts/WalletContext";
import GlassCard from "../common/GlassCard";

const BalanceCard = () => {
  const { isGuest } = useAuth();
  const { wallet, bonus } = useWallet();
  const [showBalance, setShowBalance] = useState(false);

  if (isGuest) return null;

  const walletVal = wallet || 0;
  const bonusVal = bonus || 0;
  const totalCoins = walletVal + bonusVal;

  return (
    <GlassCard sx={{ mb: 2 }}>
      <Box sx={{ p: 2.5, pb: 2 }}>
        {/* Total balance row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--color-txt-muted)",
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            Total Balance
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowBalance((p) => !p)}
            sx={{ color: "var(--color-txt-muted)", p: 0.5 }}
          >
            {showBalance ? (
              <VisibilityOff sx={{ fontSize: 18 }} />
            ) : (
              <Visibility sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Box>

        {/* Big number */}
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: "2.4rem",
              color: "var(--color-bingo-yellow)",
              lineHeight: 1,
              fontFamily: "'Inter', 'Roboto', sans-serif",
            }}
          >
            {showBalance ? totalCoins.toLocaleString() : "••••"}
          </Typography>
          <Typography
            sx={{
              fontSize: "1rem",
              color: "var(--color-bingo-yellow)",
              fontWeight: 700,
              opacity: 0.8,
            }}
          >
            ETB
          </Typography>
        </Box>
      </Box>

      {/* Wallet / Bonus split */}
      <Box
        sx={{
          display: "flex",
          borderTop: "1px solid var(--color-bingo-border)",
        }}
      >
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRight: "1px solid var(--color-bingo-border)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "8px",
                background: "hsla(155, 90%, 45%, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 15, color: "var(--color-bingo-secondary)" }} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--color-txt-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Main Wallet
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "white",
              lineHeight: 1.2,
            }}
          >
            {showBalance ? walletVal.toLocaleString() : "••••"}{" "}
            <span style={{ fontSize: "0.75rem", color: "var(--color-bingo-secondary)" }}>ETB</span>
          </Typography>
        </Box>

        <Box sx={{ flex: 1, p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "8px",
                background: "hsla(42, 95%, 52%, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CardGiftcard sx={{ fontSize: 15, color: "var(--color-bingo-accent)" }} />
            </Box>
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "var(--color-txt-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Play Wallet
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "white",
              lineHeight: 1.2,
            }}
          >
            {showBalance ? bonusVal.toLocaleString() : "••••"}{" "}
            <span style={{ fontSize: "0.75rem", color: "var(--color-bingo-accent)" }}>ETB</span>
          </Typography>
        </Box>
      </Box>

      {/* Quick Action Buttons */}
      <Box sx={{ display: "flex", gap: 1.5, p: 2, pt: 0 }}>
       
        <Box
          component={Link}
          to="/my-wallet?tab=withdraw"
          sx={{
            flex: 1,
            textAlign: "center",
            py: 1.2,
            borderRadius: "14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--color-bingo-border)",
            color: "white",
            fontWeight: 700,
            fontSize: "0.85rem",
            textDecoration: "none",
            transition: "all 0.2s ease",
            "&:active": { transform: "scale(0.97)" },
          }}
        >
          Withdraw
        </Box>
      </Box>
    </GlassCard>
  );
};

export default BalanceCard;