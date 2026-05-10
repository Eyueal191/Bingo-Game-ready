import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import LeaderboardTable from "./LeaderboardTable";
import { useApi } from "../../contexts/ApiContext";

const Leaderboard = () => {
  const api = useApi();
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/v1/games-history/leaderboard", {
          params: { limit: 10 },
        });
        if (isMounted) {
          setLeaderboardData(response.data || {});
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to load leaderboard"
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [api]);

  const players = leaderboardData?.leaderboard || [];
  const currentUser = leaderboardData?.currentUser || null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 4 } }}>
        <Paper
          elevation={16}
          sx={{
            width: "100%",
            borderRadius: 4,
            background: "var(--color-bingo-bg)",
            p: { xs: 3, md: 5 },
          }}
        >
          <Stack spacing={3}>
            <Box textAlign="center">
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  color: "text.primary",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  mb: 1,
                  fontSize: { xs: "1.5rem", md: "1.8rem" }, // Bigger on mobile
                }}
              >
                Top Players
              </Typography>
              <Typography variant="body1" sx={{ color: "text.primary" }}>
                Real-time ranking of this period's bingo winners and bonus payouts.
              </Typography>

              {/* Shortened Scoring Definition */}
              <Typography
                variant="body2"
                sx={{
                  color: "text.primary",
                  mt: 2,
                  fontWeight: 500,
                  fontSize: { xs: "1rem", md: "1.2rem" },
                  textAlign: "center",
                }}
              >
                <strong>Scoring:</strong> Each game played earns <strong>2 points</strong>.
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ py: 8, textAlign: "center" }}>
                <CircularProgress color="primary" />
              </Box>
            ) : error ? (
              <Box sx={{ py: 4 }}>
                <Typography color="error" align="center">
                  {error}
                </Typography>
              </Box>
            ) : (
              <LeaderboardTable players={players} currentUser={currentUser} />
            )}

            {!loading && !error && players.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center">
                No winners yet. Join a game to claim the first spot.
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
};

export default Leaderboard;
