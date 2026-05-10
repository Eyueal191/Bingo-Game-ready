import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TWA from "@twa-dev/sdk";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import { useWallet } from "../../contexts/WalletContext";
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  Collapse,
  CircularProgress,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion } from "framer-motion";
import { toast } from "sonner";

const NumberSelector = ({
  maxNumbers,
  takenNumbers,
  selectedNumbers,
  onSelect,
  renderNumber,
}) => {
  const numbers = Array.from({ length: maxNumbers }, (_, i) => i + 1);
  return (
    <Grid container spacing={1} sx={{ mt: 1 }}>
      {numbers.map((number) => (
        <Grid item key={number}>
          <Box
            onClick={() => onSelect(number)}
            sx={{
              cursor: takenNumbers.includes(number) ? "not-allowed" : "pointer",
              opacity: takenNumbers.includes(number) ? 0.5 : 1,
            }}
          >
            {renderNumber(number)}
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

const MaterialLotteryGameRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthLoading } = useAuth();
  const { wallet, bonus } = useWallet();
  const socket = useSocket();
  const [currentGame, setCurrentGame] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [takenNumbers, setTakenNumbers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const isTelegram = !!TWA.initDataUnsafe.user;

  const handleNumberSelect = useCallback(
    (number) => {
      if (!currentGame) return;
      if (takenNumbers.includes(number)) {
        toast.error(`Number ${number} is already taken`);
        return;
      }
      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > currentGame.max_players
      ) {
        toast.error(
          `Number ${number} is invalid. Must be between 1 and ${currentGame.max_players}`
        );
        return;
      }
      if (selectedNumbers.includes(number)) {
        setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
      } else {
        setSelectedNumbers([...selectedNumbers, number]);
      }
    },
    [selectedNumbers, takenNumbers, currentGame]
  );

  const handleJoinGame = useCallback(() => {
    console.log("Attempting to join game:", {
      gameId: id,
      userId: user?.id,
      selectedNumbers,
      user,
    });
    if (!user) {
      setError("Please log in to join the game");
      toast.error("Please log in to join the game");
      return;
    }
    if (!id) {
      setError("Invalid game ID");
      toast.error("Invalid game ID");
      return;
    }
    if (selectedNumbers.length === 0) {
      setError("Please select at least one number");
      toast.error("Please select at least one number");
      return;
    }
    const totalAvailable = (wallet || 0) + (bonus || 0);
    const requiredAmount = currentGame.bet_amount * selectedNumbers.length;
    if (currentGame && totalAvailable < requiredAmount) {
      setError("Insufficient balance");
      toast.error("Insufficient balance");
      return;
    }

    // Check for duplicate numbers
    const uniqueNumbers = [...new Set(selectedNumbers)];
    if (uniqueNumbers.length !== selectedNumbers.length) {
      setError("Duplicate numbers are not allowed");
      toast.error("Duplicate numbers are not allowed");
      return;
    }

    setJoinStatus("pending");
    socket.emit(
      "join_material_lottery_game",
      { gameId: id, userId: user._id, selectedNumbers },
      (response) => {
        console.log("Join response:", response);
        if (response.success) {
          setSuccess(`Joined game with numbers: ${selectedNumbers.join(", ")}`);
          setJoinStatus("success");
          setSelectedNumbers([]);
          if (isTelegram) {
            TWA.MainButton.hide();
          }
        } else {
          setError(response.error.message);
          toast.error(response.error.message);
          setJoinStatus("error");
        }
      }
    );
  }, [user, selectedNumbers, socket, id, currentGame, isTelegram]);

  useEffect(() => {
    if (isAuthLoading || !id || !socket) {
      setError("Missing game ID or socket connection");
      toast.error("Missing game ID or socket connection");
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Please log in to join the game");
      toast.error("Please log in to join the game");
      setLoading(false);
      return;
    }

    if (!socket.connected) {
      const onConnect = () => {
        console.log(
          "[MaterialLotteryGameRoom] Socket connected, joining room",
          id
        );
        if (!hasJoinedRoom) {
          socket.emit("join_material_lottery", id);
          setHasJoinedRoom(true);
        }
      };
      socket.on("connect", onConnect);
      return () => socket.off("connect", onConnect);
    } else if (!hasJoinedRoom) {
      console.log(
        "[MaterialLotteryGameRoom] Socket already connected, joining room",
        id
      );
      socket.emit("join_material_lottery", id);
      setHasJoinedRoom(true);
    }

    const handleRoomData = (data) => {
      if (String(data.roomId) === String(id)) {
        console.log("Received room data:", data);
        setCurrentGame(data);
        setTakenNumbers(
          Array.from(
            new Set(
              (data.participants || []).flatMap((p) =>
                Array.isArray(p.numbers) ? p.numbers.map(Number) : []
              )
            )
          )
        );
        setLoading(false);
      }
    };

    const handleGameUpdate = (data) => {
      if (
        data.gameType !== "material_lottery" ||
        String(data.roomId) !== String(id)
      )
        return;
      if (data.type === "status") {
        setCurrentGame((prev) => ({ ...prev, status: data.status }));
        toast.info(data.message);
        if (data.status === "in_progress") {
          navigate(`/material-lottery-game-play/${id}`);
        }
        if (data.status === "completed") {
          setTimeout(() => {
            navigate("/material-lottery-rooms");
          }, 5000);
        }
      } else if (data.type === "winner") {
        toast.success(
          `ደረጃ ${data.rank} አሸናፊ: ${data.user} (ቁጥር: ${data.number}, ሽልማት: ${data.prize})`
        );
      }
    };

    const handleJoinSuccess = ({ gameId }) => {
      if (String(gameId) === String(id)) {
        setSuccess(`Joined game successfully`);
        setSelectedNumbers([]);
        setJoinStatus("success");
      }
    };

    const handleError = ({ message, gameId }) => {
      if (!gameId || String(gameId) === String(id)) {
        setError(message);
        toast.error(message);
        setJoinStatus("error");
        setLoading(false);
      }
    };



    const handleConnectError = () => {
      setError("Failed to connect to game server. Retrying...");
      toast.error("Failed to connect to game server. Retrying...");
      setTimeout(() => socket.connect(), 1000);
    };

    socket.on("material_lottery_room_data", handleRoomData);
    socket.on("gameUpdate", handleGameUpdate);
    socket.on("join_success", handleJoinSuccess);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);

    if (isTelegram) {
      TWA.MainButton.setText("Join Material Lottery")
        .show()
        .onClick(handleJoinGame);
    }

    return () => {
      socket.off("material_lottery_room_data", handleRoomData);
      socket.off("gameUpdate", handleGameUpdate);
      socket.off("join_success", handleJoinSuccess);
      socket.off("error", handleError);
      socket.off("connect_error", handleConnectError);
      if (isTelegram) TWA.MainButton.hide();
    };
  }, [
    id,
    navigate,
    socket,
    user,
    isAuthLoading,
    isTelegram,
    handleJoinGame,
    hasJoinedRoom,
    selectedNumbers,
    wallet,
    bonus,
  ]);

  useEffect(() => {
    if (error) {
      setError("");
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      setSuccess("");
    }
  }, [success]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentGame) {
    return (
      <Typography align="center" sx={{ py: 10, color: "white" }}>
        Game not available
      </Typography>
    );
  }

  const totalNumbersTaken = takenNumbers.length;
  const remainingNumbers = currentGame.max_players - totalNumbersTaken;

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen py-6 px-4 dynamic-bg"
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <IconButton
          color="inherit"
          onClick={() => navigate("/material-lottery-rooms")}
          sx={{ color: "white" }}
        >
          <ArrowBackIcon sx={{ fontSize: 40 }} />
        </IconButton>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#00BFFF",
            borderRadius: "12px",
            minWidth: "200px",
            height: "35px",
            fontWeight: "bold",
            mt: 1,
            fontSize: "1rem",
            color: "white",
            "&:hover": { backgroundColor: "#0099cc" },
          }}
          onClick={() => navigate("/keshkesh-rooms")}
        >
          ከሽከሽ ይጫዎቱ
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.1)",
          p: 2,
          borderRadius: 2,
          boxShadow: 3,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography color="white" variant="h5">
            Material Lottery Room {currentGame.roomId.slice(0, 8)}{" "}
            <Typography
              component="span"
              variant="subtitle2"
              sx={{ ml: 1, color: "#FFD700", fontWeight: 700 }}
            >
              {currentGame.round || 1}ኛ ዙር
            </Typography>
          </Typography>
          <IconButton
            onClick={() => setShowDetails(!showDetails)}
            sx={{ color: "white" }}
          >
            <ExpandMoreIcon
              sx={{
                transition: "transform 0.3s",
                transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </IconButton>
        </Box>
        <Collapse in={showDetails}>
          <List>
            <ListItem>
              <ListItemText
                primary="መደብ"
                secondary={`${formatCurrency(currentGame.bet_amount)} ብር`}
                secondaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
            {currentGame.rewards.map((reward) => (
              <ListItem key={reward.rank}>
                <ListItemText
                  primary={`ደረጃ ${reward.rank} ሽልማት`}
                  secondary={
                    reward.type === "monetary"
                      ? `${formatCurrency(reward.amount)} ብር`
                      : reward.description
                  }
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
            ))}
            <ListItem>
              <ListItemText
                primary="የተዎሰዱ ቁጥሮች"
                secondary={`${totalNumbersTaken}/${currentGame.max_players}`}
                secondaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="ያልተያዙ ቁጥሮች"
                secondary={remainingNumbers}
                secondaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="ሁኔታ"
                secondary={currentGame.status}
                secondaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
          </List>
        </Collapse>
        {!showDetails && (
          <Typography color="white" sx={{ textAlign: "center", mt: 1 }}>
            {currentGame.round || 1}ኛ ዙር | ውርርድ:{" "}
            {formatCurrency(currentGame.bet_amount)} ብር | ሽልማት:{" "}
            {currentGame.rewards
              .map((r) =>
                r.type === "monetary"
                  ? `${formatCurrency(r.amount)}`
                  : r.description
              )
              .join("/")}{" "}
            | {totalNumbersTaken>1 ? "የተያዙ":"የተያዘ"}: {totalNumbersTaken}/{currentGame.max_players} | ሁኔታ:{" "}
            {currentGame.status}
          </Typography>
        )}
      </Box>

      {currentGame.status === "pending" && remainingNumbers > 0 && (
        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            p: 2,
            borderRadius: 2,
            boxShadow: 3,
            mb: 2,
          }}
        >
          <Typography color="white" variant="h6" gutterBottom>
            የማቴሪያል ሎተሪ እጣዎች የእርስዎን ይምረጡ
          </Typography>
          <NumberSelector
            maxNumbers={currentGame.max_players}
            takenNumbers={takenNumbers}
            selectedNumbers={selectedNumbers}
            onSelect={handleNumberSelect}
            renderNumber={(number) => (
              <motion.div
                whileHover={{ scale: 1.1, rotateY: 360 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  transform: "perspective(500px) rotateX(20deg)",
                  transformStyle: "preserve-3d",
                  boxShadow: "5px 5px 15px rgba(0, 0, 0, 0.3)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: takenNumbers.includes(number)
                    ? "#ff4444"
                    : selectedNumbers.includes(number)
                    ? "#00cc00"
                    : "#ffffff",
                  color: "#000",
                  fontWeight: "bold",
                }}
              >
                {number}
              </motion.div>
            )}
          />
          {!isTelegram && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{
                  py: 2,
                  width: "80%",
                  maxWidth: "300px",
                  fontSize: "1.1rem",
                }}
                onClick={handleJoinGame}
                disabled={
                  selectedNumbers.length === 0 || joinStatus === "pending"
                }
              >
                {joinStatus === "pending" ? "Joining..." : "Join Game"}
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.1)",
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography color="white" variant="h6" gutterBottom>
          ተሳፊዎች
        </Typography>
        <List>
          {currentGame.participants && currentGame.participants.length > 0 ? (
            currentGame.participants.map((participant, idx) => (
              <ListItem
                key={participant.user_id || participant._id || idx}
                divider
              >
                <ListItemText
                  primary={
                    participant.full_name ||
                    participant.user?.fullName ||
                    "ያልታዎቀ"
                  }
                  secondary={`ቁጥሮች: ${
                    Array.isArray(participant.numbers) &&
                    participant.numbers.length > 0
                      ? participant.numbers.join(", ")
                      : "የለም"
                  }${
                    participant.rank && participant.rank.length > 0
                      ? ` (ደረጃ ${participant.rank.join(", ")})`
                      : ""
                  }`}
                  primaryTypographyProps={{ color: "white" }}
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="ተሳፊ አልተገኘም።"
                primaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
          )}
        </List>
      </Box>
    </motion.div>
  );
};

export default MaterialLotteryGameRoom;