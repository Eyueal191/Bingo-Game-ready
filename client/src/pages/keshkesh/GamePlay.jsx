import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TWA from "@twa-dev/sdk";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/socketContext";
import { useWallet } from "../../contexts/WalletContext";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { SHAKE_DURATION_MS } from "./constants";
import { useKeshkeshAudio } from "./hooks/useKeshkeshAudio";
import { useShakeController } from "./hooks/useShakeController";
import { useKeshkeshGame } from "./hooks/useKeshkeshGame";
import { useWebGLContextMonitor } from "./hooks/useWebGLContextMonitor";
import { useKeshkeshSocketLogger } from "./hooks/useKeshkeshSocketLogger";
import KeshkeshJar from "./components/KeshkeshJar";
import WinnerBanner from "./components/WinnerBanner";
import WinnerAlerts from "./components/WinnerAlerts";
import GameSummary from "./components/GameSummary";
import ParticipantsList from "./components/ParticipantsList";

const GamePlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, bonus } = useWallet();
  const socket = useSocket();
  const canvasRef = useRef(null);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const isTelegram = Boolean(TWA?.initDataUnsafe?.user);

  const {
    ensureAudioUnlocked,
    playShakeSound,
    stopShakeSound,
    playWinnerSound,
    stopAllAudio,
  } = useKeshkeshAudio();

  const { isShaking, triggerShake, stopShake } = useShakeController({
    ensureAudioUnlocked,
    playShakeSound,
    stopShakeSound,
  });

  const handleNavigateHome = useCallback(() => {
    navigate("/keshkesh-rooms");
  }, [navigate]);

  const {
    currentGame,
    setCurrentGame,
    winners,
    error,
    setError,
    loading,
    isGameCompleted,
  } = useKeshkeshGame({
    gameId: id,
    socket,
    user,
    triggerShake,
    stopShake,
    playWinnerSound,
    onNavigateHome: handleNavigateHome,
  });

  useKeshkeshSocketLogger({
    socket,
    user,
    gameId: id,
  });

  useWebGLContextMonitor({
    canvasRef,
    onContextLost: () => {
      setWebGLAvailable(false);
      setError("3D rendering failed due to WebGL context loss. Showing 2D fallback.");
      console.warn("WebGL context lost, switching to 2D fallback");
    },
    onContextRestored: () => {
      setWebGLAvailable(true);
      setError("");
      console.log("WebGL context restored");
    },
  });

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const takenNumbers = useMemo(() => {
    const allNumbers =
      currentGame?.participants?.flatMap((participant) =>
        Array.isArray(participant.numbers) ? participant.numbers : []
      ) || [];

    return allNumbers.filter(
      (num) => !winners.some((winner) => winner.number === num)
    );
  }, [currentGame, winners]);

  const totalNumbersTaken = takenNumbers.length;

  useEffect(() => {
    if (
      !isGameCompleted &&
      currentGame?.shake &&
      currentGame?.status === "in_progress" &&
      takenNumbers.length > 0
    ) {
      console.log("[GamePlay] Triggering shake");
      triggerShake();
    }
  }, [
    currentGame?.shake,
    currentGame?.status,
    isGameCompleted,
    takenNumbers.length,
    triggerShake,
  ]);

  useEffect(() => {
    if (!isShaking && currentGame?.shake) {
      setCurrentGame((prev) => (prev ? { ...prev, shake: undefined } : prev));
    }
  }, [isShaking, currentGame?.shake, setCurrentGame]);

  useEffect(() => {
    console.log("[GamePlay] currentGame:", currentGame);
  }, [currentGame]);

  useEffect(() => {
    console.log("[GamePlay] winners:", winners);
  }, [winners]);

  useEffect(() => {
    console.log("[GamePlay] webGLAvailable:", webGLAvailable);
    console.log("[GamePlay] takenNumbers:", takenNumbers);
    if (!webGLAvailable) {
      console.warn("[GamePlay] WebGL not available, showing 2D fallback");
    }
    if (takenNumbers.length === 0) {
      console.warn("[GamePlay] No numbers in jar, nothing to render");
    }
  }, [webGLAvailable, takenNumbers]);

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
      <Typography align="center" sx={{ py: 10 }}>
        {error}
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

  const latestWinner = winners[winners.length - 1] || null;
  const prizeTiers = Array.isArray(currentGame?.prize_tiers)
    ? [...currentGame.prize_tiers].sort((a, b) => a.rank - b.rank)
    : [];

  const formatCurrency = (value) =>
    typeof value === "number" && !Number.isNaN(value)
      ? value.toFixed(2)
      : value;

  const linearProgressValue =
    ((Date.now() % SHAKE_DURATION_MS) / SHAKE_DURATION_MS) * 100;

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

      <Typography variant="h4" align="center" gutterBottom>
        ከሽከሽ ጨዋታ #{id?.slice(0, 8)}
      </Typography>

      <GameSummary
        currentGame={currentGame}
        prizeTiers={prizeTiers}
        formatCurrency={formatCurrency}
        totalNumbersTaken={totalNumbersTaken}
        isShaking={isShaking}
        walletBalance={wallet}
        bonusBalance={bonus}
      />

      {isShaking && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={linearProgressValue} />
        </Box>
      )}

      <KeshkeshJar
        numbers={takenNumbers}
        isShaking={isShaking}
        webGLAvailable={webGLAvailable}
        canvasRef={canvasRef}
      >
        <WinnerBanner winner={latestWinner} />
      </KeshkeshJar>

      <WinnerAlerts winners={winners} />

      <ParticipantsList participants={currentGame.participants} />

      {!isTelegram && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNavigateHome}
            sx={{ minWidth: 220 }}
          >
            Back to Rooms
          </Button>
        </Box>
      )}
    </motion.div>
  );
};

export default GamePlay;
