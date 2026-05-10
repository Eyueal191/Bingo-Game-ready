import {
  Typography,
  Box,
  Paper,
  Chip,
} from "@mui/material";

import ArrowForward from "@mui/icons-material/ArrowForward";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { StyledButton } from "./StyledButton";

const RoomCard = ({ room, status, handleJoinGame, role, isDesktop }) => {
  return (
    <Paper
                  key={room._id}
                  elevation={0}
                  sx={{
                    position: "relative",
                    background: "var(--color-bingo-card)",
                    borderRadius: { xs: "16px", md: "22px" },
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow:
                      "0 26px 44px -32px var(--color-bingo-shadow), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                    p: { xs: 1.6, sm: 2.1, md: 2.4 },
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 1.4, sm: 1.9 },
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1.2,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: "var(--color-bingo-focus)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontSize: { xs: "0.62rem", sm: "0.7rem" },
                        }}
                      >
                        Stake Level
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          mt: 0.4,
                          color: "var(--color-bingo-yellow)",
                          fontWeight: 800,
                          fontSize: { xs: "1.04rem", sm: "1.18rem", md: "1.25rem" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        Stake {room.stakeAmount} coins
                      </Typography>
                    </Box>
                    {room.bonusEnabled && (
                      <Chip
                        label="Bonus"
                        size="small"
                        sx={{
                          backgroundColor: "rgba(255, 159, 28, 0.14)",
                          color: "var(--color-bingo-yellow)",
                          fontWeight: 700,
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 159, 28, 0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: { xs: 1, sm: 1.3 },
                    }}
                  >
                    <Box
                      sx={{
                        background: "var(--color-bingo-card-alt)",
                        borderRadius: "14px",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        padding: { xs: 1, sm: 1.3 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flex: "1 1 150px",
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          color: "var(--color-bingo-yellow)",
                        }}
                      >
                        <MonetizationOnOutlinedIcon fontSize="small" />
                        <Typography
                          component="span"
                          sx={{
                            fontSize: { xs: "0.64rem", sm: "0.7rem" },
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--color-bingo-focus)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Stake
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          color: "var(--color-bingo-yellow)",
                          fontWeight: 800,
                          fontSize: { xs: "0.94rem", sm: "1.08rem" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {room.stakeAmount} coins
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        background: "var(--color-bingo-card-alt)",
                        borderRadius: "14px",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        padding: { xs: 1, sm: 1.3 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        flex: "1 1 150px",
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          color: "var(--color-bingo-yellow)",
                        }}
                      >
                        <EmojiEventsOutlinedIcon fontSize="small" />
                        <Typography
                          component="span"
                          sx={{
                            fontSize: { xs: "0.66rem", sm: "0.76rem" },
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "var(--color-bingo-focus)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Prize
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          color: room.winAmount
                            ? "var(--color-bingo-yellow)"
                            : "var(--color-bingo-focus)",
                          fontWeight: 800,
                          fontSize: { xs: "0.94rem", sm: "1.06rem" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {room.winAmount ? `${room.winAmount} coins` : "Game Pending"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { sm: "center" },
                      justifyContent: "space-between",
                      gap: { xs: 1.2, sm: 1.8 },
                      mt: 0.3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        background: "var(--color-bingo-card-alt)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        padding: { xs: "9px 12px", sm: "10px 14px" },
                        width: { xs: "100%", sm: "auto" },
                        minWidth: 0,
                        flexWrap: "wrap",
                      }}
                    >
                      <AccessTimeIcon
                        sx={{
                          fontSize: "1rem",
                          color:
                            status.tone === "accent"
                              ? "var(--color-bingo-yellow)"
                              : "var(--color-bingo-focus)",
                        }}
                      />
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: "0.66rem",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--color-bingo-focus)",
                          }}
                        >
                          {status.label}
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 700,
                            color:
                              status.tone === "accent"
                                ? "var(--color-bingo-yellow)"
                                : status.tone === "countdown"
                                  ? "var(--color-bingo-yellow)"
                                  : "var(--color-bingo-focus)",
                            fontSize: { xs: "0.92rem", sm: "0.98rem" },
                          }}
                        >
                          {status.value}
                        </Typography>
                      </Box>
                    </Box>

                    <StyledButton
                      onClick={() => handleJoinGame(room._id, room.stakeAmount)}
                      // disabled={room.status === "playing"}
                      endIcon={isDesktop ? <ArrowForward /> : null}
                      sx={{
                        width: { xs: "100%", sm: "auto" },
                        textTransform: "none",
                        letterSpacing: "0.02em",
                        fontSize: { xs: "0.92rem", sm: "1.02rem" },
                        padding: { xs: "10px 18px", sm: "12px 26px" },
                      }}
                    >
                      {role === "guest" || room.status === "playing"
                        ? "watch"
                        : "Play"}
                    </StyledButton>
                  </Box>
                </Paper>
  );
};

export default RoomCard;