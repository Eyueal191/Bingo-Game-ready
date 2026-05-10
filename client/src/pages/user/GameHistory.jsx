import React, { useState, useEffect } from "react";
import { useApi } from "../../contexts/ApiContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  Pagination,
  PaginationItem,
  Skeleton,
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";

const GameHistory = () => {
  const { token, isAuthLoading } = useAuth();
  const api = useApi();
  const [gameHistory, setGameHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!token || isAuthLoading) return;
      try {
        setLoading(true);
        const response = await api.get(
          `/api/v1/games-history/mine?page=${currentPage}&limit=${itemsPerPage}`
        );
        const { gameHistory, totalPages } = response.data;
        setGameHistory(gameHistory);
        setTotalPages(totalPages);
        setLoading(false);
      } catch {
        setError("Failed to load game history. Please try again.");
        setLoading(false);
      }
    };
    fetchGameHistory();
  }, [token, isAuthLoading, currentPage, api]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const currentItems = gameHistory;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (isAuthLoading || loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "var(--color-bingo-background2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Skeleton variant="rounded" width={300} height={40} sx={{ bgcolor: "rgba(255,255,255,0.05)" }} />
        <Skeleton variant="rounded" width={340} height={200} sx={{ bgcolor: "rgba(255,255,255,0.05)" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "var(--color-bingo-background2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ color: "var(--color-bingo-red)", fontWeight: 600 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "var(--color-bingo-background2)",
        pb: { xs: 12, md: 4 },
        pt: { xs: 8, sm: 10 },
        px: { xs: 1, sm: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: 800,
          mx: "auto",
          background: "var(--color-bingo-card)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 8px 32px var(--color-bingo-shadow)",
          p: { xs: 1.5, sm: 3 },
          overflow: "hidden",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: "var(--color-bingo-white)",
            fontSize: { xs: "1.1rem", sm: "1.4rem" },
            textAlign: "center",
            mb: 3,
            opacity: 0.85,
          }}
        >
          Game History
        </Typography>

        <Box sx={{ overflowX: "auto", borderRadius: "12px" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  background: "var(--color-bingo-card-alt)",
                }}
              >
                {["Stake", "Win", "Winner Cards", "Your Cards", "Date", "Result"].map((label) => (
                  <TableCell
                    key={label}
                    padding="none"
                    sx={{
                      color: "var(--color-bingo-yellow)",
                      fontWeight: 700,
                      textAlign: "center",
                      fontSize: { xs: "0.6rem", sm: "0.75rem" },
                      py: 1.5,
                      px: 0.5,
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentItems.map((game, index) => (
                <TableRow
                  key={game.id}
                  sx={{
                    background:
                      index % 2 === 0
                        ? "rgba(255,255,255,0.02)"
                        : "transparent",
                    "&:hover": {
                      background: "var(--color-bingo-card-alt)",
                    },
                  }}
                >
                  <TableCell
                    padding="none"
                    sx={{
                      color: "var(--color-bingo-white)",
                      textAlign: "center",
                      fontSize: { xs: "0.6rem", sm: "0.75rem" },
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    {game.stake}
                  </TableCell>
                  <TableCell
                    padding="none"
                    sx={{
                      color: "var(--color-bingo-white)",
                      textAlign: "center",
                      fontSize: { xs: "0.6rem", sm: "0.75rem" },
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    {game.gameWinning}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                      {game.winnerCards.map((card, idx) => (
                        <Box
                          key={idx}
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.3,
                            borderRadius: "6px",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            background: "rgba(85,255,119,0.12)",
                            color: "var(--color-bingo-green)",
                          }}
                        >
                          {card}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                      {game.yourCards.map((card, idx) => (
                        <Box
                          key={idx}
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.3,
                            borderRadius: "6px",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            background: "rgba(248,213,23,0.12)",
                            color: "var(--color-bingo-yellow)",
                          }}
                        >
                          {card}
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell
                    padding="none"
                    sx={{
                      color: "var(--color-bingo-muted)",
                      textAlign: "center",
                      fontSize: { xs: "0.6rem", sm: "0.7rem" },
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    {formatDate(game.date)}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      py: 1,
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        px: 1.5,
                        py: 0.4,
                        borderRadius: "8px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        background:
                          game.result === "Won"
                            ? "rgba(85,255,119,0.12)"
                            : "rgba(255,59,48,0.12)",
                        color:
                          game.result === "Won"
                            ? "var(--color-bingo-green)"
                            : "var(--color-bingo-red)",
                      }}
                    >
                      {game.result}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center", pb: 1 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(e, page) => handlePageChange(page)}
              renderItem={(item) => (
                <PaginationItem
                  slots={{ previous: ArrowBackIos, next: ArrowForwardIos }}
                  {...item}
                  sx={{
                    color: "var(--color-bingo-muted)",
                    "&.Mui-selected": {
                      background: "var(--color-bingo-yellow)",
                      color: "#000",
                      fontWeight: 700,
                    },
                  }}
                />
              )}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default GameHistory;