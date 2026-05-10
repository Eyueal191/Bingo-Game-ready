import { useEffect, useState, useRef } from "react";
import { Typography, Box, Button, Alert, CircularProgress } from "@mui/material";
import { styled } from "@mui/system";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import SpinTable from "./GameCard";

const RetryButton = styled(Button)(() => ({
  borderRadius: 18,
  padding: "10px 24px",
  fontWeight: 700,
  textTransform: "none",
  background:
    "linear-gradient(180deg, var(--color-bingo-yellow) 0%, var(--color-bingo-yellow-dark) 100%)",
  color: "#0f1221",
  border: "1px solid var(--color-bingo-yellow-dark)",
  boxShadow:
    "0 18px 36px -26px rgba(255, 159, 28, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12) inset",
  "&:hover": {
    background: "linear-gradient(180deg, #f8d517 0%, var(--color-bingo-yellow) 100%)",
    boxShadow:
      "0 24px 44px -26px rgba(255, 159, 28, 0.72), 0 0 0 1px rgba(255, 255, 255, 0.16) inset",
  },
}));

const SpinGame = () => {
  const { isAuthLoading } = useAuth();
  const socket = useSocket();
  const [gameRooms, setGameRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isAuthLoading || !socket) return;

    const handleConnect = () => {
      setLoading(true);
      setError(null);
      socket.emit("requestSpinData");
    };

    const handleRoomsUpdate = (rooms) => {
      setGameRooms(rooms || []);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };



    const handleError = ({ message }) => {
      setError(message);
      toast.error(message);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    const handleConnectError = () => {
      const message = "Connection to game server failed";
      setError(message);
      toast.error(message);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    timeoutRef.current = setTimeout(() => {
      const message = "Request timed out. Please try again.";
      setError(message);
      toast.error(message);
      setLoading(false);
    }, 10000);

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    socket.on("fetan_spin_rooms", handleRoomsUpdate);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      socket.off("connect", handleConnect);
      socket.off("fetan_spin_rooms", handleRoomsUpdate);
      socket.off("error", handleError);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, isAuthLoading]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="dynamic-bg"
      style={{ minHeight: "100vh", padding: "48px 16px" }}
    >
      <Box
        sx={{
          maxWidth: 1180,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "var(--color-bingo-white)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: { xs: "1.5rem", sm: "1.9rem" },
            }}
          >
            Quick KeshKesh Games
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 1,
              color: "var(--color-bingo-gray)",
              fontSize: { xs: "0.9rem", sm: "1rem" },
            }}
          >
            Choose your lucky number, play and win!
          </Typography>
        </Box>

        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "40vh",
            }}
          >
            <CircularProgress sx={{ color: "var(--color-bingo-yellow)" }} />
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            sx={{
              maxWidth: 520,
              mx: "auto",
              backgroundColor: "rgba(255, 59, 48, 0.1)",
              color: "var(--color-bingo-white)",
              border: "1px solid rgba(255, 59, 48, 0.25)",
            }}
          >
            {error}
          </Alert>
        ) : gameRooms.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              minHeight: "40vh",
              px: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: "var(--color-bingo-white)", fontWeight: 700 }}
            >
              No game found.
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "var(--color-bingo-muted)",
                maxWidth: 360,
                textAlign: "center",
              }}
            >
              Please return when new rooms are opened, or try again.
            </Typography>
            <RetryButton
              onClick={() => {
                setLoading(true);
                setError(null);
                socket.emit("requestSpinData");
                timeoutRef.current = setTimeout(() => {
                  const message = "Request timed out. Please try again.";
                  setError(message);
                  toast.error(message);
                  setLoading(false);
                }, 10000);
              }}
              endIcon={<span aria-hidden="true">↻</span>}
            >
              Try Again
            </RetryButton>
          </Box>
        ) : (
          <SpinTable games={gameRooms} />
        )}
      </Box>
    </motion.div>
  );
};

export default SpinGame;
