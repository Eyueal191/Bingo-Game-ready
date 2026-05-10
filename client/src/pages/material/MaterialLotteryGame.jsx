import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import TWA from "@twa-dev/sdk";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  styled,
  Dialog,
  DialogContent,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowForward from "@mui/icons-material/ArrowForward";
import KeshKeshIcon from "../../components/keshkesh/KeshKeshIcon";

// Animations
const fadeIn = {
  animation: "fadeIn 1.2s ease-out",
};
const pulse = {
  animation: "pulse 8s infinite linear",
};
const buttonGlow = {
  animation: "buttonGlow 1.5s infinite",
};

// Add CSS keyframes to the document
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1) rotate(5deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes buttonGlow {
      0% { box-shadow: 0 0 5px #FF4500; }
      50% { box-shadow: 0 0 15px #FF8C00; }
      100% { box-shadow: 0 0 5px #FF4500; }
    }
  `;
  document.head.appendChild(style);
}

// Styled components
const MaterialLotteryCard = styled(Card)(() => ({
  background: "linear-gradient(135deg, #1a2a44, #2d3748)",
  borderRadius: "15px",
  margin: "12px 0",
  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4), 0 -3px 6px rgba(0, 0, 0, 0.2)",
  ...fadeIn,
  display: "flex",
  flexWrap: "wrap", // allow children to wrap to next row
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px",
  width: "100%",
  maxWidth: "420px",
  marginLeft: "auto",
  marginRight: "auto",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background:
      "radial-gradient(circle, rgba(255, 69, 0, 0.1) 0%, transparent 70%)",
    ...pulse,
    zIndex: 0,
  },
  "& > *": {
    position: "relative",
    zIndex: 1,
  },
}));

const MaterialLotteryButton = styled(Button)(() => ({
  background: "linear-gradient(145deg, #FF4500, #FF8C00)",
  color: "white",
  borderRadius: "25px",
  padding: "8px 16px",
  fontWeight: "bold",
  fontSize: "1rem",
  textTransform: "none",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)",
  "&:hover": {
    background: "linear-gradient(145deg, #FF6347, #FFA500)",
    boxShadow: "0 6px 12px rgba(0, 0, 0, 0.4), 0 3px 6px rgba(0, 0, 0, 0.3)",
    ...buttonGlow,
  },
  "&:disabled": {
    background: "linear-gradient(145deg, #A9A9A9, #808080)",
    color: "white",
    boxShadow: "none",
  },
  display: "flex",
  alignItems: "center",
}));

const StatusText = styled(Typography)(({ status }) => ({
  fontWeight: "bold",
  color:
    status === "pending"
      ? "#00FF00"
      : status === "in_progress"
      ? "#FF0000"
      : "#FFFFFF",
  animation: status === "pending" ? "pulse 2s infinite" : "none",
}));

const InfoBox = styled(Box)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}));

// Single image component that adapts size based on mode (row vs thumb)
const RewardImage = styled("img")(({ theme, $mode }) => ({
  display: "block",
  objectFit: "cover",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
  cursor: "pointer",
  width: $mode === "row" ? "100%" : 100,
  height: $mode === "row" ? 120 : 60,
  marginLeft: $mode === "thumb" ? "8px" : 0,
  [theme.breakpoints.up("sm")]: {
    width: $mode === "row" ? "100%" : 100,
    height: $mode === "row" ? 140 : 70,
  },
  [theme.breakpoints.up("md")]: {
    width: $mode === "row" ? "100%" : 120,
    height: $mode === "row" ? 160 : 84,
  },
}));


const MaterialLotteryGame = () => {
  const { isAuthLoading } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const [gameRooms, setGameRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const isTelegram = !!TWA.initDataUnsafe.user;

  useEffect(() => {
    if (isAuthLoading || !socket) return;

    const handleConnect = () => {
      setLoading(true);
      setError(null);
      socket.emit("requestMaterialLotteryData");
    };

    if (socket.connected) {
      handleConnect();
    }

    const handleRoomsUpdate = (rooms) => {
      setGameRooms(rooms || []);
      setLoading(false);
    };

    const handleError = ({ message }) => {
      setError(message);
      toast.error(message);
      setLoading(false);
    };

    const handleConnectError = () => {
      setError("Connection to game server failed");
      toast.error("Connection to game server failed");
      setLoading(false);
    };

    socket.on("connect", handleConnect);
    socket.on("material_lottery_rooms", handleRoomsUpdate);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("material_lottery_rooms", handleRoomsUpdate);
      socket.off("error", handleError);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, isAuthLoading]);

  const handleJoin = (game) => {
    if (isTelegram) {
      TWA.MainButton.setText("Join Material Lottery")
        .show()
        .onClick(() => {
          navigate(`/material-lottery-room/${game._id}`);
          TWA.MainButton.hide();
        });
    } else {
      navigate(`/material-lottery-room/${game._id}`);
    }
  };

  const takenNumbers = (game) => {
    return game.participants.flatMap((p) => p.numbers).length;
  };

  const remainingNumbers = (game) => {
    return game.max_players - takenNumbers(game);
  };

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  const handleImageClick = (photo) => {
    setSelectedImage(`${import.meta.env.VITE_APP_API_URL}/${photo}`);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedImage(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-10 px-4 dynamic-bg"
      style={{ minHeight: "100vh" }}
    >
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{ color: "white" }}
      >
        የማቴሪያል ሎተሪ ጨዋታ ክፍል
      </Typography>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ maxWidth: "600px", mx: "auto", my: 2 }}>
          {error}
        </Alert>
      ) : gameRooms.length === 0 ? (
        <Typography variant="h6" align="center" sx={{ my: 4, color: "white" }}>
          የማቴሪያል ሎተሪ ክፍል የለም። እባኮትን በኋላ ይመለሱ!
        </Typography>
      ) : (
        <Box>
          {gameRooms.map((game) => (
            <MaterialLotteryCard key={game._id}>
              <CardContent sx={{ flexGrow: 1, padding: "10px" }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  width="100%"
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    sx={{ pr: 1, flex: "1 1 auto", minWidth: 0 }}
                  >
                    <KeshKeshIcon size={42} />
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" color="white">
                          {formatCurrency(game.bet_amount)} ብር
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "#FFD700", fontWeight: 700 }}
                        >
                          {game.round || 1}ኛ ዙር
                        </Typography>
                        {/* Status moved near amount */}
                        {game.rewards.some((r) => r.photo) && (
                          <StatusText status={game.status}>
                            {game.status === "pending"
                              ? "ክፍት የሆነ"
                              : game.status === "in_progress"
                              ? "በመጫዎት ላይ"
                              : game.status}
                          </StatusText>
                        )}
                      </Box>
                      <InfoBox>
                        <Typography variant="body2" color="white">
                          <span role="img" aria-label="players">
                            👥
                          </span>{" "}
                          {takenNumbers(game)}/{game.max_players}
                        </Typography>
                        {(() => {
                          const hasImage = game.rewards.some((r) => r.photo);
                          if (hasImage) {
                            const firstImg = game.rewards.find((r) => r.photo);
                            return (
                              <Box
                                sx={{
                                  width: "100%",
                                  display: { xs: "block", sm: "flex" },
                                  gap: 1.5,
                                  alignItems: "flex-start",
                                  mt: 1,
                                }}
                              >
                                {/* Image takes full row on xs, and left side on sm+ */}
                                <Box
                                  sx={{
                                    flex: { xs: "0 0 100%", sm: "0 0 58%" },
                                  }}
                                >
                                  <RewardImage
                                    $mode="row"
                                    src={`${import.meta.env.VITE_APP_API_URL}/${
                                      firstImg.photo
                                    }`}
                                    alt={firstImg.description || "Reward"}
                                    onClick={() =>
                                      handleImageClick(firstImg.photo)
                                    }
                                  />
                                </Box>
                                {/* Rewards list to the right (or below on xs) */}
                                <Box
                                  sx={{
                                    flex: { xs: "0 0 100%", sm: "1 1 42%" },
                                    mt: { xs: 1, sm: 0 },
                                  }}
                                >
                                  {game.rewards.map((reward) => (
                                    <Typography
                                      key={reward.rank}
                                      variant="body2"
                                      sx={{
                                        fontWeight:
                                          reward.rank === 1 ? 700 : 500,
                                        color:
                                          reward.rank === 1
                                            ? "#FFD700"
                                            : "#C0C0C0",
                                        mb: 0.5,
                                      }}
                                    >
                                      {reward.rank}ኛ{" "}
                                      {reward.type === "monetary"
                                        ? `${formatCurrency(reward.amount)} ብር`
                                        : reward.description}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            );
                          }
                          // No image case: compact list, shrink spacing
                          return (
                            <Box sx={{ mt: 1 }}>
                              {game.rewards.map((reward) => (
                                <Typography
                                  key={reward.rank}
                                  variant="body2"
                                  sx={{
                                    fontWeight: reward.rank === 1 ? 700 : 500,
                                    color:
                                      reward.rank === 1 ? "#FFD700" : "#C0C0C0",
                                    mb: 0.5,
                                  }}
                                >
                                  {reward.rank}ኛ{" "}
                                  {reward.type === "monetary"
                                    ? `${formatCurrency(reward.amount)} ብር`
                                    : reward.description}
                                </Typography>
                              ))}
                            </Box>
                          );
                        })()}
                      </InfoBox>
                    </Box>
                  </Box>
                  {/* No separate right image: handled inside InfoBox as a full-row section */}
                </Box>

                {/* Status fallback when no image */}
                {!game.rewards.some((r) => r.photo) && (
                  <Box textAlign="right" mt={1}>
                    <Typography
                      variant="caption"
                      sx={{ color: "#FFD700", fontWeight: 700, mr: 1 }}
                    >
                      ዙር {game.round || 1}
                    </Typography>
                    <StatusText status={game.status}>
                      {game.status === "pending"
                        ? "ክፍት የሆነ"
                        : game.status === "in_progress"
                        ? "በመጫዎት ላይ"
                        : game.status}
                    </StatusText>
                  </Box>
                )}
              </CardContent>

              {/* Button on its own row, bottom-aligned */}
              <Box
                width="100%"
                mb={1}
                sx={{
                  flexBasis: "100%", // force new row under flexWrap
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <MaterialLotteryButton
                  variant="contained"
                  onClick={() => handleJoin(game)}
                  disabled={
                    game.status !== "pending" || remainingNumbers(game) === 0
                  }
                  endIcon={<ArrowForward />}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  {game.status === "pending" && remainingNumbers(game) > 0
                    ? "ይምረጡ"
                    : game.status === "pending"
                    ? "ሞልቷል"
                    : "በመጫዎት ላይ"}
                </MaterialLotteryButton>
              </Box>
            </MaterialLotteryCard>
          ))}
        </Box>
      )}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "15px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
            maxWidth: isXS ? "90vw" : "500px",
            maxHeight: isXS ? "80vh" : "600px",
            position: "relative",
          },
        }}
      >
        <IconButton
          aria-label="close"
          onClick={handleCloseModal}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "white",
            zIndex: 1,
            background: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              background: "rgba(0, 0, 0, 0.7)",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {selectedImage && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <img
                src={selectedImage}
                alt="Reward"
                style={{
                  maxWidth: "100%",
                  maxHeight: isXS ? "70vh" : "500px",
                  objectFit: "contain",
                  borderRadius: "10px",
                }}
              />
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
      <Box sx={{ mt: 4 }} />
    </motion.div>
  );
};

export default MaterialLotteryGame;