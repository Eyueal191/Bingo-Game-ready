import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import Confetti from "react-confetti";
import { Howl } from "howler";
import { toast } from "sonner";
import winnerMp3 from "/assets/winner.mp3";
import shakeMp3 from "/assets/shake.mp3";

const JAR_RADIUS = 2;
const JAR_HEIGHT = 4;
const DICE_SIZE = 0.4;
const GRAVITY = -0.015;
const BOUNCE = 0.7;
const SHAKE_FORCE = 0.18;

const JarScene = React.memo(({ isShaking, numbers }) => {
  const jarRef = useRef(null);
  const diceRefs = useRef([]);
  const diceState = useRef(
    numbers.map((num) => ({
      pos: [
        Math.sin(num * 1.3) * (JAR_RADIUS - DICE_SIZE),
        Math.random() * (JAR_HEIGHT - DICE_SIZE) - JAR_HEIGHT / 2,
        Math.cos(num * 1.7) * (JAR_RADIUS - DICE_SIZE),
      ],
      vel: [0, 0, 0],
      num,
    }))
  );

  useEffect(() => {
    diceState.current = numbers.map((num) => ({
      pos: [
        Math.sin(num * 1.3) * (JAR_RADIUS - DICE_SIZE),
        Math.random() * (JAR_HEIGHT - DICE_SIZE) - JAR_HEIGHT / 2,
        Math.cos(num * 1.7) * (JAR_RADIUS - DICE_SIZE),
      ],
      vel: [0, 0, 0],
      num,
    }));
  }, [numbers]);

  useFrame((state) => {
    if (jarRef.current) {
      if (isShaking) {
        const t = state.clock.getElapsedTime();
        jarRef.current.rotation.x = Math.sin(t * 8) * 0.18;
        jarRef.current.rotation.y = Math.sin(t * 6) * 0.12;
        jarRef.current.rotation.z = Math.cos(t * 10) * 0.13;
        jarRef.current.position.y = Math.abs(Math.sin(t * 3.5)) * 0.25;
        jarRef.current.scale.set(1.04, 1.04, 1.04);
      } else {
        jarRef.current.rotation.set(0, 0, 0);
        jarRef.current.position.y = 0;
        jarRef.current.scale.set(1, 1, 1);
      }
    }
    diceState.current.forEach((dice, i) => {
      if (isShaking) {
        dice.vel[0] += (Math.random() - 0.5) * SHAKE_FORCE;
        dice.vel[1] += (Math.random() - 0.5) * SHAKE_FORCE * 0.7;
        dice.vel[2] += (Math.random() - 0.5) * SHAKE_FORCE;
      }
      dice.vel[1] += GRAVITY;
      dice.pos[0] += dice.vel[0];
      dice.pos[1] += dice.vel[1];
      dice.pos[2] += dice.vel[2];
      const r = Math.sqrt(dice.pos[0] ** 2 + dice.pos[2] ** 2);
      if (r > JAR_RADIUS - DICE_SIZE / 2) {
        const angle = Math.atan2(dice.pos[2], dice.pos[0]);
        dice.pos[0] = Math.cos(angle) * (JAR_RADIUS - DICE_SIZE / 2);
        dice.pos[2] = Math.sin(angle) * (JAR_RADIUS - DICE_SIZE / 2);
        dice.vel[0] *= -BOUNCE;
        dice.vel[2] *= -BOUNCE;
      }
      if (dice.pos[1] < -JAR_HEIGHT / 2 + DICE_SIZE / 2) {
        dice.pos[1] = -JAR_HEIGHT / 2 + DICE_SIZE / 2;
        dice.vel[1] *= -BOUNCE;
      }
      if (dice.pos[1] > JAR_HEIGHT / 2 - DICE_SIZE / 2) {
        dice.pos[1] = JAR_HEIGHT / 2 - DICE_SIZE / 2;
        dice.vel[1] *= -BOUNCE;
      }
      dice.vel[0] *= 0.97;
      dice.vel[1] *= 0.97;
      dice.vel[2] *= 0.97;
      if (diceRefs.current[i]) {
        diceRefs.current[i].position.set(dice.pos[0], dice.pos[1], dice.pos[2]);
      }
    });
  });

  return (
    <group>
      <mesh ref={jarRef}>
        <cylinderGeometry
          args={[JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 48, 1, true]}
        />
        <meshPhysicalMaterial
          color="#b3e0ff"
          transparent
          opacity={0.35}
          roughness={0.08}
          metalness={0.2}
          thickness={0.5}
          transmission={0.95}
          ior={1.5}
          clearcoat={0.7}
        />
      </mesh>
      <mesh position={[0, JAR_HEIGHT / 2 + 0.18, 0]}>
        <cylinderGeometry
          args={[JAR_RADIUS * 0.98, JAR_RADIUS * 0.98, 0.18, 48]}
        />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, JAR_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry
          args={[JAR_RADIUS, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshPhysicalMaterial
          color="#b3e0ff"
          transparent
          opacity={0.35}
          roughness={0.08}
          metalness={0.2}
          thickness={0.5}
          transmission={0.95}
          ior={1.5}
          clearcoat={0.7}
        />
      </mesh>
      {numbers.map((num, i) => (
        <mesh
          key={num}
          ref={(el) => (diceRefs.current[i] = el)}
          position={diceState.current[i]?.pos}
        >
          <boxGeometry args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} />
          <meshStandardMaterial color="#DEB887" roughness={0.5} />
          <Text
            position={[0, 0, DICE_SIZE / 2 + 0.02]}
            fontSize={0.2}
            color="black"
            anchorX="center"
            anchorY="middle"
          >
            {num}
          </Text>
        </mesh>
      ))}
    </group>
  );
});

const MaterialLotteryGamePlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, bonus } = useWallet();
  const socket = useSocket();
  const [currentGame, setCurrentGame] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [winners, setWinners] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [audioPrompt, setAudioPrompt] = useState(true);
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const shakeTimerRef = useRef(null);
  const audioUnlocked = useRef(false);
  const canvasRef = useRef(null);
  const winnerAudio = useRef(new Audio(winnerMp3));
  const shakeAudio = useRef(new Audio(shakeMp3));
  const winnerSound = useRef(null);
  const shakeSound = useRef(null);
  const isTelegram = !!TWA.initDataUnsafe.user;

  useEffect(() => {
    shakeAudio.current.loop = true;
    winnerAudio.current.volume = 1.0;
    shakeAudio.current.volume = 1.0;

    try {
      winnerSound.current = new Howl({
        src: [winnerMp3],
        volume: 1,
        preload: true,
        onload: () => console.log("Winner sound loaded successfully"),
        onloaderror: (id, err) =>
          console.error("Winner sound load error:", err),
        onplayerror: (id, err) =>
          console.error("Winner sound play error:", err),
      });
      shakeSound.current = new Howl({
        src: [shakeMp3],
        volume: 1,
        loop: true,
        preload: true,
        onload: () => console.log("Shake sound loaded successfully"),
        onloaderror: (id, err) => console.error("Shake sound load error:", err),
        onplayerror: (id, err) => console.error("Shake sound play error:", err),
      });
    } catch (err) {
      console.error("Howler initialization error:", err);
    }
  }, []);

  const unlockAudio = () => {
    if (!audioUnlocked.current) {
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
        audioUnlocked.current = true;
        setAudioPrompt(false);
        audioContext.close();
      } catch (e) {
        console.error("Audio context unlock error:", e);
      }
    }
  };

  const triggerShake = useCallback(() => {
    console.log("[MaterialLotteryGamePlay] triggerShake called");
    setIsShaking(true);
    if (audioUnlocked.current) {
      const audio = shakeAudio.current;
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => console.log("Shake audio played successfully"))
          .catch((e) => {
            console.error("Shake audio error:", e);
            if (shakeSound.current) {
              shakeSound.current.play();
              console.log("Fallback to Howler for shake sound");
            }
          });
      }
    } else {
      unlockAudio();
      const audio = shakeAudio.current;
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => console.log("Shake audio played successfully"))
          .catch((e) => {
            console.error("Shake audio retry error:", e);
            if (shakeSound.current) {
              shakeSound.current.play();
              console.log("Fallback to Howler for shake sound");
            }
          });
      }
    }
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      setIsShaking(false);
      const audio = shakeAudio.current;
      if (audio) audio.pause();
      if (shakeSound.current) shakeSound.current.stop();
      setCurrentGame((prev) => (prev ? { ...prev, shake: undefined } : prev));
      console.log("[MaterialLotteryGamePlay] Shake animation stopped");
    }, 30000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const handleContextLost = (e) => {
        e.preventDefault();
        setWebGLAvailable(false);
        setError(
          "3D rendering failed due to WebGL context loss. Showing 2D fallback."
        );
        console.warn("WebGL context lost, switching to 2D fallback");
      };
      const handleContextRestored = () => {
        setWebGLAvailable(true);
        setError("");
        console.log("WebGL context restored");
      };
      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);
      return () => {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener(
          "webglcontextrestored",
          handleContextRestored
        );
      };
    }
  }, []);

  useEffect(() => {
    if (!id || !socket || !user) return;

    const maxRetries = 3;
    let retryCount = 0;

    const connectSocket = () => {
      if (!socket.connected && retryCount < maxRetries) {
        socket.connect();
      }
    };

    const handleConnect = () => {
      socket.emit("join_material_lottery", id);
      retryCount = 0;
    };

    const handleRoomData = (data) => {
      if (data.roomId === id) {
        setCurrentGame(data);
        setLoading(false);
      } else if (data.gameType === "material_lottery" && isGameCompleted) {
        console.log(
          "[MaterialLotteryGamePlay] Ignoring new game data for room:",
          data.roomId
        );
      }
    };

    const handleGameUpdate = (data) => {
      if (data.gameType !== "material_lottery" || data.roomId !== id) return;
      console.log("[MaterialLotteryGamePlay] gameUpdate received:", data);
      if (data.type === "update") {
        setCurrentGame((prev) => ({ ...prev, ...data.game }));
        setLoading(false);
      } else if (data.type === "winner") {
        setWinners((prev) => {
          if (
            prev.some((w) => w.rank === data.rank && w.number === data.number)
          )
            return prev;
          return [...prev, data];
        });
        if (audioUnlocked.current) {
          winnerAudio.current.currentTime = 0;
          winnerAudio.current
            .play()
            .then(() => console.log("Winner audio played successfully"))
            .catch((e) => {
              console.error("Winner audio error:", e);
              if (winnerSound.current) {
                winnerSound.current.play();
                console.log("Fallback to Howler for winner sound");
              }
            });
        } else {
          unlockAudio();
          winnerAudio.current.currentTime = 0;
          winnerAudio.current
            .play()
            .then(() => console.log("Winner audio played successfully"))
            .catch((e) => {
              console.error("Winner audio retry error:", e);
              if (winnerSound.current) {
                winnerSound.current.play();
                console.log("Fallback to Howler for winner sound");
              }
            });
        }
      } else if (data.type === "status" && data.status === "completed") {
        setIsShaking(false);
        setIsGameCompleted(true);
        const audio = shakeAudio.current;
        if (audio) audio.pause();
        if (shakeSound.current) shakeSound.current.stop();
        setLoading(false);
        setTimeout(() => {
          navigate("/material-lottery-rooms");
          setCurrentGame(null);
          setWinners([]);
          setIsGameCompleted(false);
        }, 5000);
      }
    };



    const handleError = ({ message, gameId }) => {
      if (!gameId || gameId === id) {
        setError(message);
        toast.error(message);
        setLoading(false);
      }
    };

    const handleConnectError = () => {
      retryCount++;
      if (retryCount < maxRetries) {
        setTimeout(() => socket.connect(), 1000 * retryCount);
      } else {
        setError("Failed to connect to game server after retries");
        toast.error("Failed to connect to game server after retries");
        setLoading(false);
      }
    };

    const handleReshake = (data) => {
      if (data.roomId === id && data.shake && !isGameCompleted) {
        console.log(
          "[MaterialLotteryGamePlay] Received material_lottery_reshake event"
        );
        triggerShake();
        setLoading(false);
      }
    };

    connectSocket();
    const shakeAudioRef = shakeAudio.current;
    socket.on("connect", handleConnect);
    socket.on("material_lottery_room_data", handleRoomData);
    socket.on("gameUpdate", handleGameUpdate);
    socket.on("error", handleError);
    socket.on("connect_error", handleConnectError);
    socket.on("material_lottery_reshake", handleReshake);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("material_lottery_room_data", handleRoomData);
      socket.off("gameUpdate", handleGameUpdate);
      socket.off("error", handleError);
      socket.off("connect_error", handleConnectError);
      socket.off("material_lottery_reshake", handleReshake);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      if (shakeAudioRef) shakeAudioRef.pause();
      if (shakeSound.current) shakeSound.current.stop();
    };
  }, [id, navigate, socket, user, triggerShake, isGameCompleted]);

  useEffect(() => {
    console.log("[MaterialLotteryGamePlay] currentGame:", currentGame);
  }, [currentGame]);

  const takenNumbers = React.useMemo(() => {
    const allNumbers =
      currentGame?.participants?.flatMap((p) =>
        Array.isArray(p.numbers) ? p.numbers : []
      ) || [];
    return allNumbers.filter(
      (num) => !winners.some((winner) => winner.number === num)
    );
  }, [currentGame, winners]);
  const totalNumbersTaken = takenNumbers.length;

  useEffect(() => {
    console.log("[MaterialLotteryGamePlay] webGLAvailable:", webGLAvailable);
    console.log("[MaterialLotteryGamePlay] takenNumbers:", takenNumbers);
    if (!webGLAvailable) {
      console.warn(
        "[MaterialLotteryGamePlay] WebGL not available, showing 2D fallback"
      );
    }
    if (takenNumbers.length === 0) {
      console.warn(
        "[MaterialLotteryGamePlay] No numbers in jar, nothing to render"
      );
    }
  }, [webGLAvailable, takenNumbers]);

  useEffect(() => {
    console.log("[MaterialLotteryGamePlay] winners:", winners);
  }, [winners]);

  useEffect(() => {
    if (!id || !socket || !user) return;
    const logEvent = (name, data) =>
      console.log(`[MaterialLotteryGamePlay] Socket event: ${name}`, data);
    socket.on("material_lottery_room_data", (data) =>
      logEvent("material_lottery_room_data", data)
    );
    socket.on("gameUpdate", (data) => logEvent("gameUpdate", data));
    socket.on("error", (data) => logEvent("error", data));
    socket.on("connect_error", (data) => logEvent("connect_error", data));
    socket.on("material_lottery_reshake", (data) =>
      logEvent("material_lottery_reshake", data)
    );
    return () => {
      socket.off("material_lottery_room_data");
      socket.off("gameUpdate");
      socket.off("error");
      socket.off("connect_error");
      socket.off("material_lottery_reshake");
    };
  }, [id, socket, user]);

  useEffect(() => {
    console.log(
      "[MaterialLotteryGamePlay] Shake useEffect - shake flag:",
      currentGame?.shake,
      "status:",
      currentGame?.status,
      "takenNumbers:",
      takenNumbers.length,
      "isGameCompleted:",
      isGameCompleted
    );
    if (
      !isGameCompleted &&
      currentGame?.shake &&
      currentGame?.status === "in_progress" &&
      takenNumbers.length > 0
    ) {
      console.log("[MaterialLotteryGamePlay] Triggering shake");
      triggerShake();
    }
  }, [
    currentGame?.status,
    currentGame?.shake,
    takenNumbers.length,
    triggerShake,
    isGameCompleted,
  ]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }
  if (error && !currentGame) {
    return (
      <Typography align="center" sx={{ py: 10, color: "white" }}>
        {error}
      </Typography>
    );
  }
  if (!currentGame) {
    return (
      <Typography align="center" sx={{ py: 10, color: "white" }}>
        Game not available
      </Typography>
    );
  }

  const latestWinner = winners[winners.length - 1];
  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-10 px-4 dynamic-bg"
      style={{ minHeight: "75vh" }}
    >
      <AnimatePresence>
        {winners.length > 0 && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={300}
            tweenDuration={6000}
            confettiSource={{
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
              w: window.innerWidth,
              h: 0,
            }}
            initialVelocityY={{ min: -10, max: 10 }}
            gravity={0.2}
            colors={["#FFD700", "#C0C0C0", "#FF4500", "#00FF00", "#1E90FF"]}
          />
        )}
      </AnimatePresence>

      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{ color: "white" }}
      >
        የማቴሪያል ሎተሪ ጨዋታ #{id?.slice(0, 8)}
        <Typography
          component="span"
          variant="subtitle2"
          sx={{ ml: 1, color: "#FFD700", fontWeight: 700 }}
        >
          {currentGame?.round || 1}ኛ ዙር
        </Typography>
      </Typography>

      <Box
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.1)",
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
          mb: 4,
        }}
      >
        <Typography color="white">ዙር: {currentGame?.round || 1}</Typography>
        <Typography color="white">
          መደብ: {formatCurrency(currentGame.bet_amount)} ብር
        </Typography>
        {currentGame.rewards.map((reward) => (
          <Typography key={reward.rank} color="white">
            ደረጃ {reward.rank} ሽልማት:{" "}
            {reward.type === "monetary"
              ? `${formatCurrency(reward.amount)} ብር`
              : reward.description}
          </Typography>
        ))}
        <Typography color="white">
          የተያዙ ቁጥሮች: {totalNumbersTaken}/{currentGame.max_players}
        </Typography>
        <Typography color="white">
          ሁኔታ: {isShaking ? "Shaking the Jar..." : currentGame.status}
        </Typography>
        <Typography color="white">
          ዋሌት: {formatCurrency(wallet)} ብር | ቦነስ: {formatCurrency(bonus)} ብር
        </Typography>
      </Box>

      {isShaking && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={(Date.now() % 30000) / 300}
          />
        </Box>
      )}

      <Box
        sx={{
          height: "400px",
          mb: 4,
          borderRadius: "16px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          position: "relative",
        }}
      >
        {takenNumbers.length === 0 && (
          <Typography
            color="error"
            sx={{ position: "absolute", top: 8, left: 8, zIndex: 2 }}
          >
            በጃር ውስጥ ቁጥሮች የለም ለማሳየት።
          </Typography>
        )}
        {webGLAvailable ? (
          <Canvas
            camera={{ position: [0, 2, 6], fov: 50 }}
            gl={{ alpha: true, preserveDrawingBuffer: false }}
            ref={canvasRef}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <JarScene isShaking={isShaking} numbers={takenNumbers} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={1}
            />
          </Canvas>
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
          >
            <Typography color="white">
              3D Jar unavailable due to rendering issues.
            </Typography>
            {takenNumbers.length > 0 && (
              <Typography color="white">
                ቁጥሮች በጃር ውስጥ: {takenNumbers.join(", ")}
              </Typography>
            )}
          </Box>
        )}
        <AnimatePresence>
          {latestWinner && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 3,
                backgroundColor:
                  latestWinner.rank === 1
                    ? "rgba(255, 215, 0, 0.9)"
                    : "rgba(192, 192, 192, 0.9)",
                padding: "8px 16px",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "black",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                ደረጃ: {latestWinner.rank} አሸናፊ: {latestWinner.number} (
                {latestWinner.user})
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "black", textAlign: "center" }}
              >
                ሽልማት: {latestWinner.prize}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <AnimatePresence>
        {winners.map((winner, index) => (
          <motion.div
            key={`${winner.rank}-${winner.number}`}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -50 }}
            transition={{ duration: 0.6, delay: index * 0.4 }}
          >
            <Alert
              severity="success"
              sx={{
                mb: 2,
                bgcolor: winner.rank === 1 ? "#FFD700" : "#C0C0C0",
                color: "black",
                fontWeight: "bold",
                fontSize: "1.2rem",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              ደረጃ: {winner.rank} አሸናፊ: ቁጥር {winner.number} ({winner.user})
              - ሽልማት: {winner.prize}
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
          ተሳታፊዎችተሳታፊዎች ({currentGame.participants.length})
        </Typography>
        <List
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 2,
            boxShadow: 3,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {currentGame.participants.map((participant) => (
            <ListItem key={participant.user_id} divider>
              <ListItemText
                primary={participant.full_name || "ያልታዎቀ"}
                secondary={`ቁጥሮች: ${participant.numbers.join(
                  ", "
                )} | ሁኔታ: ${participant.paid_status} | ደረጃ: ${
                  participant.rank?.length > 0
                    ? participant.rank.sort().join(", ")
                    : "None"
                }`}
                primaryTypographyProps={{ style: { color: "white" } }}
                secondaryTypographyProps={{ style: { color: "white" } }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {!isTelegram && (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={() => navigate("/material-lottery-rooms")}
          sx={{ mt: 4, py: 1.5 }}
        >
          ወደ ማቴሪያል ሎተሪ ገጽ ተመለስ
        </Button>
      )}
    </motion.div>
  );
};

export default MaterialLotteryGamePlay;