import React from "react";
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import StarIcon from "@mui/icons-material/Star";

// Function to format points
const formatPoints = (value) => {
  const points = Number(value || 0); 
  if (!points) return "0 Points";
  return points === 1 ? "1 Point" : `${points.toLocaleString("en-US")} Points`;
};

const formatGamesPlayed = (value) => {
  const games = Number(value || 0);
  if (!games) return "0 Games Played";
  return games === 1 ? "1 Game Played" : `${games.toLocaleString("en-US")} Games Played`;
};
const formatGamesPlayedTable = (value) => {
  const games = Number(value || 0);
  if (!games) return "0 Games";
  return games === 1 ? "1 Game" : `${games.toLocaleString("en-US")} Games`;
};

// Function to display rank icons
const rankIcon = (rank) => {
  if (rank === 1) return <EmojiEventsIcon sx={{ color: "#f59e0b" }} />;
  if (rank === 2) return <MilitaryTechIcon sx={{ color: "#9ca3af" }} />;
  if (rank === 3) return <StarIcon sx={{ color: "#d97706" }} />;
  return null;
};

// LeaderboardTable component to render the leaderboard
const LeaderboardTable = ({ players = [], currentUser = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const rows = Array.isArray(players) ? players.slice(0, 10) : [];
  const currentUserOutsideTopTen =
    currentUser && !rows.some((player) => player.isCurrentUser);

  // Mobile view rendering
  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {rows.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 2, textAlign: "center", borderRadius: 2 }}
          >
            <Typography variant="body2" color="text.secondary">
              No leaderboard data yet. Join a game to see the rankings.
            </Typography>
          </Paper>
        ) : (
          rows.map((player, index) => {
            const highlightColor =
              player.rank && player.rank <= 3
                ? "rgba(59, 130, 246, 0.12)"
                : "rgba(148, 163, 184, 0.12)";

            return (
              <Paper
                key={`${player.rank || "nr"}-${player.displayName}-${index}`}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  borderColor:
                    player.rank && player.rank <= 3
                      ? "rgba(59, 130, 246, 0.4)"
                      : "rgba(148, 163, 184, 0.4)",
                  background: highlightColor,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "rgba(29, 78, 216, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {rankIcon(player.rank)}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                      {player.rank ? `#${player.rank}` : "-"} {player.displayName}
                    </Typography>
                    {player.maskedPhone && (
                      <Typography variant="caption" color="text.secondary">
                        {player.maskedPhone}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Points: {formatPoints(player.points ?? 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Games: {formatGamesPlayed(player.gamesPlayed ?? 0)}
                  </Typography>
                </Stack>
              </Paper>
            );
          })
        )}
        {currentUserOutsideTopTen && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              borderColor: "rgba(34, 197, 94, 0.6)",
              background:
                "linear-gradient(90deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))",
            }}
          >
            <Typography sx={{ fontWeight: 700, color: "#065f46" }}>
              {currentUser.displayName || "You"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Outside top 10 — keep playing to climb the ranks.
            </Typography>
          </Paper>
        )}
      </Stack>
    );
  }

  // Desktop view rendering
  return (
    <TableContainer
      sx={{
        borderRadius: 3,
        background: "rgba(15, 23, 42, 0.02)",
        overflowX: "auto",
      }}
    >
      <Table size="small" sx={{ minWidth: 480 }}>
        <TableHead>
          <TableRow sx={{ background: "rgba(30, 64, 175, 0.08)" }}>
            <TableCell align="center">Rank</TableCell>
            <TableCell>User Name (Phone Last Digits)</TableCell>
            <TableCell align="right">Points collected</TableCell>
            <TableCell align="right">Games played</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No leaderboard data yet. Join a game to see the rankings.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map((player, index) => {
            const highlight =
              player.rank && player.rank <= 3
                ? "rgba(59, 130, 246, 0.12)"
                : "transparent";
            return (
              <TableRow
                key={`${player.rank || "nr"}-${player.displayName}-${index}`}
                sx={{
                  background: highlight,
                  transition: "background 0.2s ease",
                  "&:hover": { background: "rgba(30, 64, 175, 0.18)" },
                }}
              >
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    {rankIcon(player.rank)}
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {player.rank ?? "-"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 700, color: "#1e3a8a" }}>
                    {player.displayName}
                  </Typography>
                  {player.maskedPhone && (
                    <Typography variant="caption" color="text.secondary">
                      {player.maskedPhone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatPoints(player.points ?? 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#0f172a" }}>
                  {formatGamesPlayedTable(player.gamesPlayed ?? 0)}
                </TableCell>
              </TableRow>
            );
          })}
          {currentUserOutsideTopTen && (
            <TableRow
              sx={{
                background:
                  "linear-gradient(90deg, rgba(34,197,94,0.25), rgba(34,197,94,0.05))",
              }}
            >
              <TableCell align="center" sx={{ fontWeight: 700 }}>
                {currentUser.rank ?? "-"}
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: "#065f46" }}>
                {currentUser.displayName || "You"}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatPoints(currentUser.points ?? 0)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#065f46" }}>
                {currentUser.gamesPlayed ?? 0}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LeaderboardTable;
