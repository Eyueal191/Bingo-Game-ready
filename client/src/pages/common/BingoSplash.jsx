import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useAppConfig } from "../../contexts/AppConfigContext";
const BingoSplash = ({ isVisible }) => {
  const { config } = useAppConfig();
  if (!isVisible) return null;
  const logo =
    config.branding?.squareLogoUrl ||
    config.branding?.logoUrl ||
    "";
  const appNameLocalized =
    config.identity?.appNameLocalized ||
    config.identity?.appName ||
    "";
  const appName = config.identity?.appName || "";

  const Variants = {
    animate: {
      scale: [1, 1.05, 1],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <Box className="relative flex items-center justify-center min-h-screen dynamic-bg overflow-hidden">
      {/* Animated BG */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(245,179,1,0.12) 0%, transparent 55%)," +
            "radial-gradient(circle at 80% 16%, rgba(111,143,255,0.1) 0%, transparent 50%)," +
            "linear-gradient(160deg, rgba(17,23,35,0.95) 0%, rgba(24,30,45,0.98) 100%)",
        }}
        animate={{ opacity: [0.94, 1, 0.94] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <Box
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(245,179,1,0.22) 0%, rgba(24,30,45,0.6) 55%, rgba(17,23,35,0.88) 100%)",
        }}
      />

      {/* Content */}
      <Box className="relative z-10 flex flex-col items-center space-y-6">
        {/* Image Wrapper with Background */}
        <motion.div
          className="w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] rounded-[34px] p-3 relative"
          variants={Variants}
          animate="animate"
          style={{
            boxShadow:
              "0 26px 52px -34px rgba(7,9,14,0.85), 0 0 0 1px rgba(255,255,255,0.08) inset",
            background:
              "linear-gradient(140deg, rgba(24,31,45,0.94) 0%, rgba(32,41,58,0.98) 100%)",
          }}
        >
          <div
            className="absolute inset-0 rounded-[28px]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(245,179,1,0.32) 0%, transparent 60%)",
              boxShadow:
                "0 0 0 1px rgba(245,179,1,0.2) inset, 0 18px 36px -30px rgba(245,179,1,0.4)",
            }}
          />
          <img
            src={logo}
            alt={appName}
            className="rounded-[24px] w-full h-full object-cover relative z-10"
            style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          />
        </motion.div>

        {/* Titles */}
        <Typography
          variant="h3"
          className="font-bold text-center text-4xl sm:text-5xl lg:text-6xl"
          style={{
            fontFamily: "'Noto Sans Ethiopic', 'Manrope', sans-serif",
            color: "var(--color-bingo-white)",
            letterSpacing: 8,
            textTransform: "uppercase",
            textShadow: "0 22px 38px rgba(0,0,0,0.65)",
          }}
        >
          {appNameLocalized}
        </Typography>
        <Typography
          variant="h6"
          className="text-xl sm:text-2xl"
          style={{
            color: "var(--color-bingo-yellow)",
            fontWeight: 600,
            letterSpacing: 4,
          }}
        >
          {appName}
        </Typography>

        {/* Custom Spinner */}
        <div className="spinner mt-8">
          <div className="outer">
            <div className="inner tl"></div>
            <div className="inner tr"></div>
            <div className="inner br"></div>
            <div className="inner bl"></div>
          </div>
          {/* Center yellow bingo ball */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(245,179,1,0.95) 80%, rgba(245,179,1,0.65) 100%)",
              boxShadow:
                "0 0 24px 8px rgba(245,179,1,0.55), 0 0 32px 12px rgba(245,179,1,0.35)",
              border: "2px solid rgba(255,255,255,0.18)",
              zIndex: 2,
            }}
          />
        </div>
      </Box>
    </Box>
  );
};

export default BingoSplash;
