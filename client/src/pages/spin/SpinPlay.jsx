import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../../contexts/socketContext";
import { Howl } from "howler";
import { toast } from "sonner";
import SpinWheel from "../../components/spin/SpinWheelWrapper";
import Confetti from "react-confetti";
import winnerMp3 from "/assets/winner.mp3";
import shakeMp3 from "/assets/spin-wheel.mp3";

const SpinPlay = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinState, setSpinState] = useState(null);
  const spinStateRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winners, setWinners] = useState([]); // keep history of winners (multiple ranks)
  const [winner, setWinner] = useState(null);
  const [pendingWinner, setPendingWinner] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGameCompleted, setIsGameCompleted] = useState(false);
  const isSpinningRef = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [winnerModal, setWinnerModal] = useState({ open: false, data: null });

  // Build segments: one slice per unique user (we use participant-level segments)
  // placed early so effects/hooks can reference it without conditional hook issues
  const participantSegmentsEarly = React.useMemo(() => {
    return room && Array.isArray(room.participants) && room.participants.length
      ? room.participants.map((p, idx) => ({
        id: String(p.user_id),
        label: p.full_name || String(p.user_id).slice(0, 6),
        prize: Math.round(room.prize_amount / (room.max_players || 6)),
        number: p.numbers && p.numbers.length ? p.numbers[0] : null,
        index: idx,
      }))
      : [];
  }, [room]);

  // Active segments & names used by the wheel (ensures sync with pin)
  // names are shown by the wheel itself now

  // Keep a ref for isSpinning to avoid stale closures
  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  // No-op: wheel now owns live name display

  // Audio refs
  const winnerSound = useRef(null);
  const shakeSound = useRef(null);
  const audioUnlocked = useRef(false);

  // Initialize audio
  useEffect(() => {
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
        audioContext.close();
      } catch (e) {
        console.error("Audio context unlock error:", e);
      }
    }
  };

  const playWinnerSound = useCallback(() => {
    if (audioUnlocked.current && winnerSound.current) {
      winnerSound.current.play();
    } else {
      unlockAudio();
      if (winnerSound.current) {
        winnerSound.current.play();
      }
    }
  }, []);

  const playShakeSound = useCallback(() => {
    if (audioUnlocked.current && shakeSound.current) {
      shakeSound.current.play();
    } else {
      unlockAudio();
      if (shakeSound.current) {
        shakeSound.current.play();
      }
    }
  }, []);

  const stopShakeSound = useCallback(() => {
    if (shakeSound.current) {
      shakeSound.current.stop();
    }
  }, []);

  useEffect(() => {
    if (!id || !socket) return;
    // Proactively join to receive room data quickly
    try {
      socket.emit("join_spin", id);
    } catch {
      /* noop join */
    }
    const onRoom = (data) => {
      if (String(data.roomId) === String(id)) {
        setRoom(data);
        setLoading(false);
      }
    };
    const onUpdate = (data) => {
      if (String(data.roomId) !== String(id)) return;
      if (data.type === "update" && data.game) setRoom(data.game);
      if (data.type === "winner") {
        // Mirror GamePlay winner UX to guarantee display
        setWinners((prev) => {
          if (
            prev.some(
              (w) =>
                w.rank === data.rank && String(w.number) === String(data.number)
            )
          )
            return prev;
          const resolved = {
            rank: data.rank,
            number: data.number,
            prize: data.prize,
            user: data.user,
            label: `${data.user} (${data.number})`,
          };
          // side effects alongside state updates
          setWinner(resolved);
          setShowConfetti(true);
          stopShakeSound();
          setIsSpinning(false);
          // toast.success(
          //   `🎉 Winner: ${resolved.label}${
          //     resolved.prize
          //       ? ` — ${Number(resolved.prize).toFixed(2)} Coins`
          //       : ""
          //   }!`
          // );
          setTimeout(() => setShowConfetti(false), 5000);
          return [...prev, resolved];
        });
      }
      if (data.type === "status" && data.status === "completed") {
        setIsGameCompleted(true);
        setTimeout(() => {
          navigate("/spin-rooms");
        }, 5000);
      }
    };

    socket.on("fetan_spin_room_data", onRoom);
    socket.on("gameUpdate", onUpdate);

    // fetan-spin specific events (optional server implementation)
    const onPrepare = (payload) => {
      if (String(payload.roomId) !== String(id)) return;
      setSpinState({ spinId: payload.spinId, segments: payload.segments });
    };
    const onStart = (payload) => {
      if (String(payload.roomId) !== String(id)) return;
      console.log("[SpinPlay] Start event received:", payload);
      // ensure segments are set and spin starts
      setSpinState({
        spinId: payload.spinId,
        segments: payload.segments,
        targetIndex: payload.targetIndex,
        durationMs: payload.durationMs || 4000,
      });
      setIsSpinning(true);
      setHasStarted(true);
      playShakeSound();
    };
    const onResult = (payload) => {
      if (String(payload.roomId) !== String(id)) return;
      console.log("[SpinPlay] Result event received:", payload);
      // Resolve winner details (prefer payload data, fallback to room/segments)
      const resolveWinner = () => {
        // prefer server-provided ticket-level segments; otherwise reconstruct from room participants
        let segments = [];
        if (Array.isArray(payload.segments) && payload.segments.length) {
          segments = payload.segments;
        } else if (Array.isArray(room?.participants)) {
          // reconstruct in the exact order server uses: flatMap over participants' numbers
          const all = [];
          room.participants.forEach((p) => {
            const nums = Array.isArray(p.numbers) ? p.numbers : [];
            nums.forEach((n) => {
              all.push({
                id: all.length,
                label:
                  p.user_id && p.user_id.fullName
                    ? p.user_id.fullName
                    : p.full_name || String(p.user_id).slice(0, 6),
                number: n,
                prize: Math.round(room.prize_amount / (room.max_players || 6)),
                user: p.user_id,
              });
            });
          });
          segments = all;
        }
        const participants = Array.isArray(room.participants)
          ? room.participants
          : [];

        const w = payload.winner || {};

        // Try several strategies to find the matching segment
        let foundSegment = null;

        if (w.segmentId) {
          foundSegment = segments.find(
            (s) => String(s.id) === String(w.segmentId)
          );
        }

        if (!foundSegment && w.userId !== undefined && w.slot !== undefined) {
          // segments created as `${user_id}_${num}` when using participantSegments
          const candidateId = `${w.userId}_${w.slot}`;
          foundSegment = segments.find(
            (s) => String(s.id) === String(candidateId)
          );
        }

        if (!foundSegment && w.userId !== undefined) {
          // find any segment that belongs to this user
          foundSegment = segments.find((s) =>
            String(s.id).startsWith(String(w.userId) + "_")
          );
        }

        if (!foundSegment && w.slot !== undefined) {
          foundSegment = segments.find(
            (s) => String(s.number) === String(w.slot) || s.number === w.slot
          );
        }

        // Build label and prize
        let label = "Unknown";
        let prize = w.prize || w.prize_amount || payload.prize || null;

        if (foundSegment) {
          // Build label using ticket/segment info to disambiguate multiple tickets per user
          const segNum = foundSegment.number ?? foundSegment.id;
          const baseLabel = foundSegment.label || foundSegment.name;
          if (baseLabel) {
            label = `${baseLabel} (${segNum})`;
          } else {
            // fallback to participant mapping
            const segId = String(foundSegment.id);
            const parts = segId.split("_");
            const userIdPart = parts.length > 1 ? parts[0] : null;
            const participant = participants.find(
              (p) => String(p.user_id) === String(userIdPart)
            );
            if (participant) {
              label = `${participant.full_name ||
                participant.username ||
                String(participant.user_id).slice(0, 6)
                } (${segNum})`;
            } else {
              label = `Player (${segNum})`;
            }
          }

          prize = prize || foundSegment.prize || null;
        } else if (w.userId) {
          const participant = participants.find(
            (p) => String(p.user_id) === String(w.userId)
          );
          if (participant) {
            const num =
              Array.isArray(participant.numbers) && participant.numbers.length
                ? participant.numbers[0]
                : "#";
            label = `${participant.full_name ||
              participant.username ||
              String(participant.user_id).slice(0, 6)
              } (${num})`;
          } else {
            label = String(w.userId);
          }
          prize = prize || w.prize || null;
        } else if (w.slot !== undefined) {
          label = `#${w.slot}`;
          prize = prize || null;
        }

        return { ...w, label, prize };
      };

      const resolved = resolveWinner();
      // Instead of immediately revealing winner, set as pending and let the wheel animate
      setPendingWinner({ ...resolved, spinId: payload.spinId });

      // If we didn't receive a prior start (missed start), ensure wheel still animates locally
      const currentSpin = spinStateRef.current;
      if (!currentSpin || currentSpin.spinId !== payload.spinId) {
        let segmentsForSpin = payload.segments || [];
        if (
          (!segmentsForSpin || segmentsForSpin.length === 0) &&
          Array.isArray(room?.participants)
        ) {
          // build one slice per ticket (like server does)
          const allNumbers = room.participants.flatMap((p) =>
            (Array.isArray(p.numbers) ? p.numbers : []).map((n, i) => ({
              id: `${String(p.user_id)}_${i}`,
              label: p.user_id
                ? p.user_id.fullName ||
                p.full_name ||
                String(p.user_id).slice(0, 6)
                : p.full_name || String(p.user_id).slice(0, 6),
              number: n,
              user: p.user_id,
            }))
          );
          if (allNumbers.length) segmentsForSpin = allNumbers;
        }
        let resolvedIndex = null;
        if (payload.targetIndex !== undefined && payload.targetIndex !== null) {
          resolvedIndex = payload.targetIndex;
        } else if (payload.winner && payload.winner.number !== undefined) {
          // find the index in provided segments matching the winning number
          const found = segmentsForSpin.findIndex(
            (s) =>
              String(s.number) === String(payload.winner.number) ||
              String(s.id) === String(payload.winner.number)
          );
          if (found >= 0) resolvedIndex = found;
        }

        // set spinState so SpinWheel will perform the animation
        setSpinState({
          spinId: payload.spinId,
          segments: segmentsForSpin,
          targetIndex: resolvedIndex,
          durationMs: payload.durationMs || 4500,
        });
        // mark spinning locally so shuffle strip and audio reflect state
        setIsSpinning(true);
        playShakeSound();
      }
    };

    socket.on("fetan_spin_prepare", onPrepare);
    socket.on("fetan_spin_start", onStart);
    socket.on("fetan_spin_result", onResult);

    return () => {
      socket.off("fetan_spin_room_data", onRoom);
      socket.off("gameUpdate", onUpdate);
      socket.off("fetan_spin_prepare", onPrepare);
      socket.off("fetan_spin_start", onStart);
      socket.off("fetan_spin_result", onResult);
    };
  }, [
    id,
    socket,
    navigate,
    playShakeSound,
    playWinnerSound,
    stopShakeSound,
    participantSegmentsEarly,
    room,
  ]);

  // keep a ref in sync to avoid useEffect dependency on spinState
  useEffect(() => {
    spinStateRef.current = spinState;
  }, [spinState]);

  if (loading) return <Typography sx={{ py: 10 }}>Loading...</Typography>;
  if (!room) return <Typography sx={{ py: 10 }}>Room info not available</Typography>;

  // Prepare segments if not provided by server (fallback)
  const defaultSegments =
    Array.isArray(room.prize_tiers) && room.prize_tiers.length
      ? room.prize_tiers.map((t) => ({
        id: t.rank,
        label: `Rank ${t.rank}`,
        prize:
          t.amount ||
          Math.round((room.prize_amount * (t.percent || 0)) / 100),
      }))
      : Array.from({ length: Math.max(6, room.max_players || 6) }).map(
        (_, i) => ({
          id: i,
          label: `#${i + 1}`,
          prize: Math.round(room.prize_amount / (room.max_players || 6)),
        })
      );

  // Build segments: one slice per unique user (we use participant-level segments)
  const participantSegments =
    Array.isArray(room.participants) && room.participants.length
      ? room.participants.map((p, idx) => ({
        id: String(p.user_id),
        label: p.full_name || String(p.user_id).slice(0, 6),
        prize: Math.round(room.prize_amount / (room.max_players || 6)),
        number: p.numbers && p.numbers.length ? p.numbers[0] : null,
        index: idx,
      }))
      : null;

  const latestWinner = winners[winners.length - 1];

  return (
    <Box
      sx={{
        p: 2,
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #0f1221 0%, #0f1221 50%, #116e51 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {showConfetti && <Confetti />}

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
            colors={["#f8d517", "#55ff77", "#ff3b30", "#00ff1f", "#116e51"]}
          />
        )}
      </AnimatePresence>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "baseline",
          justifyContent: "center",
          mb: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: "#ffffff",
            textAlign: "center",
            fontWeight: 800,
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            letterSpacing: 0.3,
          }}
        >
          Quick KeshKesh
        </Typography>
        <Typography variant="h6" sx={{ color: "#f8d517", fontWeight: 700 }}>
          — Stake {room.bet_amount} coins
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "#55ff77" }}>
          · Players: {room.max_players ? room.max_players : 0}
        </Typography>
      </Box>

      {/* Preparing State (when idle) */}
      {!isSpinning && !winner && !hasStarted && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            px: 2,
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <Typography
            sx={{ color: "#55ff77", textAlign: "center", fontWeight: 600 }}
          >
            Preparing to spin...
          </Typography>
        </Box>
      )}

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
                bgcolor:
                  winner.rank === 1
                    ? "#f8d517"
                    : winner.rank === 2
                      ? "#55ff77"
                      : "#116e51",
                color: "black",
                fontWeight: "bold",
                fontSize: "1.2rem",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              Rank {winner.rank} Winner: Number {winner.number} ({winner.user})
              - Prize: {winner.prize.toFixed(2)} coins
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Wheel with built-in live needle text above the canvas */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 900,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <Box sx={{ position: "relative", flex: "0 1 640px" }}>
          <SpinWheel
            segments={
              spinState?.segments || participantSegments || defaultSegments
            }
            targetIndex={spinState?.targetIndex}
            durationMs={spinState?.durationMs || 6000}
            spinId={spinState?.spinId}
            onSpinComplete={(spinId) => {
              console.log("[SpinPlay] Spin completed:", spinId);
              setIsSpinning(false);
              stopShakeSound();
              socket.emit("fetan_spin_ack", { roomId: id, spinId });
              if (
                pendingWinner &&
                String(pendingWinner.spinId) === String(spinId)
              ) {
                const resolved = pendingWinner;
                setWinners((w) => [...w, resolved]);
                setWinner(resolved);
                setShowConfetti(true);
                playWinnerSound();
                // toast.success(
                //   `🎉 Winner: ${resolved.label}${
                //     resolved.prize ? ` — ${resolved.prize} coins` : ""
                //   }!`
                // );

                setPendingWinner(null);
                setTimeout(() => setShowConfetti(false), 5000);
              }
            }}
            readOnly={true}
            isSpinning={isSpinning}
          />

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
                      ? "rgba(248, 213, 23, 0.9)"
                      : latestWinner.rank === 2
                        ? "rgba(85, 255, 119, 0.9)"
                        : "rgba(17, 110, 81, 0.9)",
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
                  Rank {latestWinner.rank} Winner: Number {latestWinner.number} (
                  {latestWinner.user})
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "black", textAlign: "center" }}
                >
                  Prize: {latestWinner.prize.toFixed(2)} coins
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          sx={{
            color: "#ffffff",
            borderColor: "#ffffff",
            "&:hover": {
              borderColor: "#f8d517",
              backgroundColor: "rgba(248, 213, 23, 0.1)",
            },
          }}
        >
          Back to Games
        </Button>
      </Box>

      {/* Game Completion Message */}
      {isGameCompleted && (
        <Alert
          severity="success"
          sx={{
            mt: 3,
            backgroundColor: "rgba(17, 111, 77, 0.2)",
            color: "#ffffff",
            border: "1px solid #116f4d",
          }}
        >
          🎉 Game completed! Returning to games page...
        </Alert>
      )}
    </Box>
  );
};

export default SpinPlay;
