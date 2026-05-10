import { useState, useEffect, useRef } from "react";
import { useGameRooms } from "../../hooks/useGameRooms";
import { useAppConfig } from "../../contexts/AppConfigContext";
import {
  Typography,
  Box,
  Button
} from "@mui/material";
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import { MainContainer } from "../../components/GameRooms";
import BingoLoading from "../../components/common/BingoLoading";

const AnimatedCounter = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId;
    
    const startValue = prevValue.current;
    
    if (startValue === value) {
      setCount(value);
      return;
    }

    const distance = value - startValue;
    const animDuration = startValue === 0 ? duration : 800;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / animDuration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.floor(startValue + distance * easeProgress));
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(value);
        prevValue.current = value;
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  return <>{count.toLocaleString()}+</>;
};

const GameRooms = () => {
  const { rooms, isLoading, handleJoinGame, platformStats } = useGameRooms();
  const { config } = useAppConfig();
  
  const appName = config?.identity?.appName || "";

  if (isLoading) {
    return <BingoLoading message="Loading games..." size="large" />;
  }

  const getButtonGradient = (index) => {
    // Array of gradients matching the image style
    const gradients = [
      'linear-gradient(90deg, #0cebeb 0%, #20e3b2 50%, #29ffc6 100%)', // Vibrant Green
      'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)', // Bright Blue
      'linear-gradient(90deg, #f77062 0%, #fe5196 100%)', // Red/Pink
      'linear-gradient(90deg, #eb3349 0%, #f45c43 100%)', // Orange/Red
    ];
    // Specific matches exactly as user image
    if (index === 0) return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
    if (index === 1) return 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)';
    return gradients[index % gradients.length];
  };

  const baseActive = 45000;
  const baseGames = 60000;
  const basewinners = 500;
  const targetActive = baseActive + (platformStats?.activePlayers || 0);
  const targetGames = baseGames + (platformStats?.gamesPlayed || 0);
  const targetWinners = basewinners + (platformStats?.winnersToday || 0);

  return (
    <MainContainer className="dynamic-bg">
      <Box
        sx={{
          width: "100%",
          maxWidth: 550,
          mx: "auto",
          px: { xs: 2.5, sm: 3 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 4, sm: 5 },
          py: { xs: 5, sm: 7 }
        }}
      >
        {/* Header Section */}
        <Box sx={{ textAlign: "center", mt: { xs: 2, sm: 4 } }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "#fff",
              fontSize: { xs: "2rem", sm: "2.4rem" },
              lineHeight: 1.4,
              textShadow: "0 2px 10px rgba(0,0,0,0.3)"
            }}
          >
            Welcome to <br/>
            <span style={{ color: "var(--color-bingo-yellow, #FFB800)" }}>{appName}</span>{" "}
            <span style={{ color: "var(--color-bingo-yellow, #FFB800)" }}>Bingo</span>
          </Typography>
        </Box>

        {/* Stake Card Section */}
        <Box
          sx={{
            border: "1px solid rgba(255, 184, 0, 0.4)",
            borderRadius: "20px",
            background: "linear-gradient(145deg, rgba(35,35,50,0.6) 0%, rgba(20,20,30,0.8) 100%)",
            p: { xs: 3.5, sm: 4.5 },
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              color: "#fff", 
              textAlign: "center", 
              mb: 3.5, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: 1.5,
              fontWeight: 700,
              fontSize: { xs: "1.2rem", sm: "1.3rem" }
            }}
          >
            <PlayArrowOutlinedIcon sx={{ color: "var(--color-bingo-yellow, #FFB800)", fontSize: "1.5rem" }} /> 
            Choose Your Stake
          </Typography>

          {rooms.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {rooms.map((room, index) => (
                <Button
                  key={room._id}
                  onClick={() => handleJoinGame(room._id, room.stakeAmount)}
                  fullWidth
                  sx={{
                    background: getButtonGradient(index),
                    color: "#fff",
                    py: 2.2,
                    borderRadius: "16px",
                    fontWeight: 800,
                    fontSize: { xs: "1.25rem", sm: "1.35rem" },
                    textTransform: "none",
                    letterSpacing: "1px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: "0 8px 25px rgba(0,0,0,0.4)",
                      background: getButtonGradient(index), 
                    }
                  }}
                >
                  <PlayArrowOutlinedIcon sx={{ mr: 1.5, opacity: 0.9, fontSize: "1.8rem" }} /> 
                  Play {room.stakeAmount}
                </Button>
              ))}
            </Box>
          ) : (
            <Typography
              variant="body1"
              sx={{
                color: "var(--color-bingo-focus)",
                textAlign: "center",
              }}
            >
              በዚህ ጊዜ ጨዋታ አልተገኘም። እባኮትን በኋላ ይመለሱ።
            </Typography>
          )}
        </Box>

        {/* Stats Section */}
        <Box
          sx={{
            background: "linear-gradient(145deg, rgba(50,40,75,0.85) 0%, rgba(30,25,50,0.95) 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
            p: { xs: 4, sm: 5 },
            textAlign: "center",
            boxShadow: "0 15px 50px rgba(0,0,0,0.45)"
          }}
        >
          <Box sx={{ mb: 4.5 }}>
            <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, mb: 1, fontSize: { xs: "2.2rem", sm: "2.6rem" }, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              <AnimatedCounter value={targetActive} />
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", fontSize: { xs: "1.1rem", sm: "1.2rem" }, letterSpacing: "1px" }}>
              Active Players
            </Typography>
          </Box>

          <Box sx={{ mb: 4.5 }}>
            <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, mb: 1, fontSize: { xs: "2.2rem", sm: "2.6rem" }, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              <AnimatedCounter value={targetGames} />
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", fontSize: { xs: "1.1rem", sm: "1.2rem" }, letterSpacing: "1px" }}>
              Games Played
            </Typography>
          </Box>

          <Box>
            <Typography variant="h3" sx={{ color: "#fff", fontWeight: 800, mb: 1, fontSize: { xs: "2.2rem", sm: "2.6rem" }, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              <AnimatedCounter value={targetWinners} />
            </Typography>
            <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.65)", fontSize: { xs: "1.1rem", sm: "1.2rem" }, letterSpacing: "1px" }}>
              Winners Today
            </Typography>
          </Box>
        </Box>
      </Box>
    </MainContainer>
  );
};

export default GameRooms;
