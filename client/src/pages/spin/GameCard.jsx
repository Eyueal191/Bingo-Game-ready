import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, Typography, Chip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/system";
import ArrowForward from "@mui/icons-material/ArrowForward";
import SpinIcon from "../../components/keshkesh/KeshKeshIcon";
import { StyledButton } from "../../components/GameRooms";

const SpinCard = styled(Card)(({ theme }) => ({
  background:
    "linear-gradient(155deg, rgba(15, 18, 33, 0.96) 0%, rgba(15, 18, 33, 0.98) 100%)",
  borderRadius: 24,
  border: "1px solid rgba(255, 255, 255, 0.05)",
  boxShadow:
    "0 28px 48px -34px var(--color-bingo-shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
  padding: "24px 22px",
  width: "100%",
  maxWidth: 420,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 18,
  position: "relative",
  overflow: "hidden",
  [theme.breakpoints.down("sm")]: {
    borderRadius: 20,
    padding: "20px 18px",
    gap: 16,
  },
}));

const StatTile = styled(Box)(({ theme }) => ({
  background: "var(--color-bingo-card-alt)",
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.06)",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
  [theme.breakpoints.down("sm")]: {
    padding: "12px 14px",
  },
}));

const StatLabel = styled(Typography)(() => ({
  fontSize: "0.7rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-bingo-muted)",
}));

const StatValue = styled(Typography)(() => ({
  fontWeight: 800,
  fontSize: "1.05rem",
  color: "var(--color-bingo-white)",
}));

const StatusBadge = styled(Chip)(({ status }) => ({
  backgroundColor:
    status === "pending"
      ? "rgba(85, 255, 119, 0.18)"
      : status === "in_progress"
        ? "rgba(255, 159, 28, 0.18)"
        : "rgba(85, 255, 119, 0.18)",
  color:
    status === "pending"
      ? "var(--color-bingo-green)"
      : status === "in_progress"
        ? "var(--color-bingo-yellow)"
        : "var(--color-bingo-gray)",
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  paddingInline: 6,
}));

const SpinTable = ({ games }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  const handleJoin = (game) => {
    navigate(`/spin-game-room/${game._id}`);
  };

  const takenNumbers = (game) =>
    game.participants.flatMap((p) => p.numbers).length;
  const remainingNumbers = (game) => game.max_players - takenNumbers(game);

  const tierAmount = (game, t) => {
    if (typeof t.amount === "number") return t.amount;
    if (
      typeof t.percent === "number" &&
      typeof game.prize_amount === "number"
    ) {
      return (game.prize_amount * t.percent) / 100;
    }
    return 0;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        width: "100%",
      }}
    >
      {games.length > 0 ? (
        <>
          {games.map((game) => {
            const participants = takenNumbers(game);
            const remaining = remainingNumbers(game);
            return (
              <SpinCard key={game._id}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: { xs: 2, sm: 3 },
                    flexWrap: "wrap",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: "var(--color-bingo-card-alt)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SpinIcon size={32} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--color-bingo-muted)",
                        }}
                      >
                        Stake Level
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          color: "var(--color-bingo-white)",
                          fontWeight: 800,
                          fontSize: "1.3rem",
                        }}
                      >
                        {game.bet_amount} Coins
                      </Typography>
                    </Box>
                  </Box>
                  <StatusBadge
                    status={game.status}
                    label={
                      game.status === "pending"
                        ? "Open"
                        : game.status === "in_progress"
                          ? "In Progress"
                          : game.status
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <StatTile>
                    <StatLabel>Players</StatLabel>
                    <StatValue>
                      {participants}/{game.max_players}
                    </StatValue>
                    <Typography
                      variant="caption"
                      sx={{ color: "var(--color-bingo-muted)" }}
                    >
                      {remaining > 0
                        ? `${remaining} spots left`
                        : "Full"}
                    </Typography>
                  </StatTile>

                  <StatTile>
                    <StatLabel>Prize Pool</StatLabel>
                    <StatValue>
                      {typeof game.prize_amount === "number"
                        ? `${game.prize_amount.toFixed(2)} Coins`
                        : "--"}
                    </StatValue>
                    {Array.isArray(game.prize_tiers) &&
                      game.prize_tiers.length > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.75,
                          mt: 0.5,
                        }}
                      >
                        {game.prize_tiers
                          .slice()
                          .sort((a, b) => a.rank - b.rank)
                          .map((t) => (
                            <Chip
                              key={t.rank}
                              label={`Rank ${t.rank} ${tierAmount(game, t).toFixed(2)} Coins`}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(255, 159, 28, 0.14)",
                                color: "var(--color-bingo-yellow)",
                                fontWeight: 600,
                              }}
                            />
                          ))}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          color: "var(--color-bingo-muted)",
                          mt: 0.5,
                          flexWrap: "wrap",
                          fontSize: "0.75rem",
                        }}
                      >
                        <span>1st {game.prize_structure?.first?.toFixed(2)} Coins</span>
                        <span>2nd {game.prize_structure?.second?.toFixed(2)} Coins</span>
                      </Box>
                    )}
                  </StatTile>
                </Box>

                <StyledButton
                  onClick={() => handleJoin(game)}
                  disabled={game.status !== "pending" || remaining === 0}
                  endIcon={isDesktop ? <ArrowForward /> : null}
                  sx={{
                    alignSelf: { xs: "stretch", sm: "flex-end" },
                    width: { xs: "100%", sm: "auto" },
                    justifyContent: "center",
                    textTransform: "uppercase",
                  }}
                >
                  {game.status === "pending" && remaining > 0
                    ? "Select"
                    : game.status === "pending"
                      ? "Full"
                      : "Playing"}
                </StyledButton>
              </SpinCard>
            );
          })}
        </>
      ) : (
        <Typography variant="body1" color="white" gutterBottom>
          No quick keshkesh games found at the moment.
        </Typography>
      )}
    </Box>
  );
};

export default SpinTable;
