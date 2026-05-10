import { Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import KeshKeshIcon from "../../components/keshkesh/KeshKeshIcon";
import { useAppConfig } from "../../contexts/AppConfigContext";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
// BingoBallSymbol.tsx
export const BingoBallSymbol = ({ size = 32 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, #00e676, #1b5e20)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      color: "#fff",
      fontSize: size * 0.6,
      boxShadow: "0 0 10px #00c853",
    }}
  >
    B
  </Box>
);

// KeshKeshSymbol.tsx
export const KeshKeshSymbol = ({ size = 32 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: "8px",
      background: "linear-gradient(145deg, #00e676, #00c853)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      fontSize: size * 0.6,
      boxShadow: "0 0 12px #1b5e20",
    }}
  >
    🎲
  </Box>
);

// LotterySymbol.tsx
export const LotterySymbol = ({ size = 32 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, #00c853, #00e676)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      color: "#fff",
      fontSize: size * 0.6,
      boxShadow: "0 0 12px #1b5e20",
    }}
  >
    🎁
  </Box>
);

const BingoBallIcon = () => (
  <Box
    component="span"
    sx={{
      width: 48,
      height: 48,
      borderRadius: "50%",
      background: `radial-gradient(circle at 30% 30%, var(--color-bingo-yellow-soft), var(--color-bingo-yellow-dark))`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      color: "var(--color-bingo-white)",
      fontSize: "1.25rem",
      boxShadow: `
        0 0 2px var(--color-bingo-yellow),
        0 0 3px var(--color-bingo-yellow-soft),
        0 0 4px var(--color-bingo-yellow-dark)
      `,
    }}
  >
    B
  </Box>
);

const featuredGames = [
  {
    key: "bingo",
    title: "የቢንጎ ጨዋታ",
    description: "Play real-time bingo and win big jackpots.",
    renderIcon: () => <BingoBallIcon sx={{ fontSize: 44 }} />,
    cta: "View Rooms",
    to: "/games",
    renderSymbol: () => <BingoBallSymbol size={32} />,
  },
  {
    key: "keshkesh",
    title: "የከሽከሽ ጨዋታ",
    description: "Fast paced kesh-kesh action with friends.",
    renderIcon: () => <KeshKeshIcon size={42} />,
    cta: "Play Now",
    to: "/keshkesh-rooms",
    renderSymbol: () => <KeshKeshSymbol size={32} />,
  },
  {
    key: "material_lottery",
    title: "የማቴሪያል ሎተሪ ጨዋታ",
    description: "Join material lotteries and win exciting prizes.",
    renderIcon: () => (
      <KeshKeshIcon size={42} color="var(--color-material-lottery)" />
    ),
    cta: "አሁኑኑ እድልዎን ይሞክሩ",
    to: "/material-lottery-rooms",
    renderSymbol: () => <LotterySymbol size={32} />,
  },
];

const GameDashboard = () => {
    const { config } = useAppConfig();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="dynamic-bg"
      style={{ minHeight: "100vh", padding: "32px 16px" }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.75rem", md: "2.4rem" },
              color: "var(--color-bingo-yellow)",
            }}
          >
            {config.identity?.appNameLocalized || "Top Games"}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "var(--color-bingo-focus)",
              fontSize: { xs: "0.95rem", md: "1.05rem" },
            }}
          >
            ተመርጠው የተዘጋጀውን ጨዋታ ይጀምሩ፣ አንድ ጊዜ ድል ይቀርባል।
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
            },
            gap: { xs: 2, md: 3 },
          }}
        >
          {featuredGames.map((game) => {
            const isBingo = game.key === "bingo";

            return (
              <Box
                key={game.key}
                component={isBingo ? RouterLink : "div"}
                to={isBingo ? game.to : undefined}
                role="link"
                tabIndex={0}
                sx={{
                  position: "relative",
                  cursor: isBingo ? "pointer" : "default",
                  background: "var(--color-bingo-card)",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.04)",
                  boxShadow:
                    "0 26px 48px -34px var(--color-bingo-shadow), inset 0 0 0 1px rgba(255,255,255,0.04)",
                  padding: { xs: 2.4, md: 3 },
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  textDecoration: "none",
                  "&:hover": isBingo
                    ? {
                        transform: "translateY(-4px)",
                        boxShadow:
                          "0 32px 52px -30px rgba(248,180,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.08)",
                      }
                    : {},
                  "&:focus-visible": {
                    outline: "3px solid var(--color-bingo-focus)",
                    outlineOffset: 4,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "var(--color-bingo-yellow)",
                  }}
                >
                  <Box sx={{ fontSize: 0, display: "flex" }}>
                    {game.renderIcon?.()}
                  </Box>

                  {/* <Typography
                    sx={{
                      fontSize: "1.5rem",
                      lineHeight: 1,
                      textShadow: "0 0 8px rgba(255,255,255,0.3)",
                    }}
                  >
                    {game.symbol}
                  </Typography> */}
                  <Box sx={{ width: 32, height: 32 }}>
  {game.renderSymbol?.()}
</Box>
                </Box>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 800,
                    color: "var(--color-bingo-yellow)",
                  }}
                >
                  {game.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: "var(--color-bingo-focus)",
                    lineHeight: 1.6,
                  }}
                >
                  {game.description}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    fontWeight: 700,
                    color: "var(--color-bingo-yellow)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {isBingo ? game.cta : "Coming Soon"}
                </Typography>

                {!isBingo && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "20px",
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </motion.div>
  );
};

export default GameDashboard;
