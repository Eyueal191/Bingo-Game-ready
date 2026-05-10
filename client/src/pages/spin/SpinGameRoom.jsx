import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TWA from "@twa-dev/sdk";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import NumberSelector from "./NumberSelector";
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  Collapse,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SpinGameRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const [currentGame, setCurrentGame] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false); // Toggle for collapsible details
  const isTelegram = !!TWA.initDataUnsafe.user;

  const handleNumberSelect = (number) => {
    if (takenNumbers.includes(number)) return;
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== number));
    } else {
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };

  const handleJoinGame = useCallback(() => {
    if (!user) {
      setError("Please log in to join the game");
      toast.error("Please log in to join the game");
      return;
    }
    if (selectedNumbers.length === 0) {
      setError("Please select at least one number");
      toast.error("Please select at least one number");
      return;
    }
    setJoinStatus("pending");
    socket.emit("join_spin_game", {
      gameId: id,
      userId: user?._id,
      selectedNumbers,
    });
  }, [user, selectedNumbers, socket, id]);

  useEffect(() => {
    if (!id || !socket || !user) {
      setError("Missing game ID, socket, or user authentication");
      setLoading(false);
      return;
    }

    if (!socket.connected) {
      const onConnect = () => {
        console.log("[SpinGameRoom] Socket connected, joining room", id);
        socket.emit("join_spin", id);
      };
      socket.on("connect", onConnect);
      return () => socket.off("connect", onConnect);
    } else {
      console.log("[SpinGameRoom] Socket already connected, joining room", id);
      socket.emit("join_spin", id);
    }

    const handleRoomData = (data) => {
      if (String(data.roomId) === String(id)) {
        setCurrentGame(data);
        setLoading(false);
      }
    };

    const handleGameUpdate = (data) => {
      if (String(data.roomId) !== String(id)) return;
      if (data.type === "update" && data.game) {
        setCurrentGame(data.game);
      } else if (data.type === "status" && data.status === "in_progress") {
        // Route to the correct play page based on gameType
        navigate(`/spin-play/${id}`);
      }
    };

    const handleJoinSuccess = ({ gameId, added = [] }) => {
      if (String(gameId) === String(id)) {
        const msg =
          added.length > 0
            ? `Joined game with numbers: ${added.join(", ")}`
            : `No new numbers were added.`;
        setSuccess(msg);
        setSelectedNumbers([]);
        setJoinStatus("success");
      }
    };

    const handleError = ({ message, code, details, gameId }) => {
      if (!gameId || String(gameId) === String(id)) {
        let finalMsg = message || "Action failed";
        if (code === "NUMBERS_UNAVAILABLE" && details) {
          const taken = (details.takenByOthers || []).join(", ") || "-";
          const owned = (details.alreadyOwned || []).join(", ") || "-";
          const remaining = details.remainingSlots;
          const requested = details.requestedCount;
          finalMsg = `Some numbers are unavailable. Taken: [${taken}]. Already yours: [${owned}]. Remaining slots: ${remaining}. You requested ${requested}.`;
        } else if (code === "NO_NEW_NUMBERS" && details) {
          const owned = (details.alreadyOwned || []).join(", ") || "-";
          finalMsg = `You already own the selected numbers: [${owned}]`;
        }
        setError(finalMsg);
        toast.error(finalMsg);
        setLoading(false);
        setJoinStatus("error");
      }
    };

    const handleConnectError = () => {
      setError("Failed to connect to game server");
      toast.error("Failed to connect to game server");
      setLoading(false);
    };

    socket.on("fetan_spin_room_data", handleRoomData);
    socket.on("gameUpdate", handleGameUpdate);
    socket.on("join_success", handleJoinSuccess);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);

    if (isTelegram) {
      TWA.MainButton.setText("Join Game").show().onClick(handleJoinGame);
    }

    return () => {
      socket.off("fetan_spin_room_data", handleRoomData);
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
    isTelegram,
    selectedNumbers,
    handleJoinGame,
    currentGame,
  ]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setError("");
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success(success);
      setSuccess("");
    }
  }, [success]);

  if (loading) {
    return (
      <Typography align="center" sx={{ py: 10 }}>
        Loading...
      </Typography>
    );
  }
  if (!currentGame) {
    return (
      <Typography align="center" sx={{ py: 10 }}>
        Game not available
      </Typography>
    );
  }

  const takenNumbers = Array.from(
    new Set(
      (currentGame.participants || []).flatMap((p) =>
        Array.isArray(p.numbers) ? p.numbers.map(Number) : []
      )
    )
  );
  const totalNumbersTaken = takenNumbers.length;
  const remainingNumbers = currentGame.max_players - totalNumbersTaken;
  const tiersSorted = Array.isArray(currentGame.prize_tiers)
    ? [...currentGame.prize_tiers].sort((a, b) => a.rank - b.rank)
    : [];
  const formatCurrency = (val) =>
    typeof val === "number" && !Number.isNaN(val) ? val.toFixed(2) : val;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen py-6 px-4 dynamic-bg"
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.2 }}>
        <IconButton
          color="inherit"
          onClick={() => navigate("/spin-rooms")}
          sx={{ color: "white" }}
        >
          <ArrowBackIcon sx={{ fontSize: 40 }} />
        </IconButton>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#ff9f1c",
            borderRadius: "12px",
            minWidth: "200px",
            height: "35px",
            fontWeight: "bold",
            mt: 1,
            fontSize: "1rem",
            color: "white",
            "&:hover": { backgroundColor: "#55ff77" },
          }}
          onClick={() => navigate("/bingo-rooms")}
        >
          Play Bingo
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr" },
          gap: 1,
          mb: 0.6,
        }}
      >
        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0,
            }}
          >
            <Typography color="white" variant="h6">
              Game Details
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
                  primary="Stake"
                  secondary={`${currentGame.bet_amount} coins`}
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
              <ListItem>
                {tiersSorted.length > 0 ? (
                  <ListItemText
                    primary="Prizes"
                    secondary={tiersSorted
                      .map((t) => {
                        const amount =
                          t.amount ??
                          (currentGame.prize_amount && t.percent
                            ? (currentGame.prize_amount * t.percent) / 100
                            : undefined);
                        return `Rank ${t.rank}: ${amount != null
                          ? `${formatCurrency(amount)} coins`
                          : t.percent != null
                            ? `${t.percent}%`
                            : "-"
                          }`;
                      })
                      .join(" | ")}
                    secondaryTypographyProps={{ color: "white" }}
                  />
                ) : (
                  <ListItemText
                    primary="First Prize"
                    secondary={`${currentGame.prize_structure?.first} coins`}
                    secondaryTypographyProps={{ color: "white" }}
                  />
                )}
              </ListItem>
              {tiersSorted.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="Second Prize"
                    secondary={`${currentGame.prize_structure?.second} coins`}
                    secondaryTypographyProps={{ color: "white" }}
                  />
                </ListItem>
              )}
              <ListItem>
                <ListItemText
                  primary="Taken Numbers"
                  secondary={`${totalNumbersTaken}/${currentGame.max_players}`}
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Available Numbers"
                  secondary={remainingNumbers}
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
            </List>
          </Collapse>
          {!showDetails && (
            <Typography color="white" sx={{ textAlign: "center", mt: 1 }}>

              Stake: {currentGame.bet_amount} coins | Prizes:{" "}
              {tiersSorted.length > 0
                ? tiersSorted
                  .map((t) => {
                    const amount =
                      t.amount ??
                      (currentGame.prize_amount && t.percent
                        ? (currentGame.prize_amount * t.percent) / 100
                        : undefined);
                    return amount != null
                      ? formatCurrency(amount)
                      : t.percent != null
                        ? `${t.percent}%`
                        : "-";
                  })
                  .join("/")
                : `${currentGame.prize_structure?.first}/${currentGame.prize_structure?.second}`}{" "}
              coins | Taken: {totalNumbersTaken}/{currentGame.max_players}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            p: 1,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Typography color="white" variant="h6" gutterBottom>
            Choose your Quick KeshKesh numbers
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
                    ? "#ff3b30"
                    : selectedNumbers.includes(number)
                      ? "#00ff1f"
                      : "#ffffff",
                  color: "#000000",
                  fontWeight: "bold",
                }}
              >
                {number}
              </motion.div>
            )}
          />
        </Box>
      </Box>

      {!isTelegram && (
        <Box sx={{ textAlign: "center", mb: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            sx={{ py: 2, width: "80%", maxWidth: "300px", fontSize: "1.1rem" }}
            onClick={handleJoinGame}
            disabled={selectedNumbers.length === 0 || joinStatus === "pending"}
          >
            {joinStatus === "pending" ? "Joining..." : "Join Game"}
          </Button>
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
          Participants
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
                    participant.user?.full_name ||
                    "Unknown"
                  }
                  secondary={`Numbers: ${Array.isArray(participant.numbers) &&
                    participant.numbers.length > 0
                    ? participant.numbers.join(", ")
                    : "No numbers"
                    }`}
                  primaryTypographyProps={{ color: "white" }}
                  secondaryTypographyProps={{ color: "white" }}
                />
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No participants"
                primaryTypographyProps={{ color: "white" }}
              />
            </ListItem>
          )}
        </List>
      </Box>
    </motion.div>
  );
};

export default SpinGameRoom;
