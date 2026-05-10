import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  IconButton,
  Typography,
  Stack,
  Button,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getImageUrl } from "../../utils/imageUrl";
import { useApi } from "../../contexts/ApiContext";

/**
 * PromoSpotlightModal
 * - Always shown on page load (no persistent dismiss).
 * - Clicks inside won't close modal. Backdrop click or Escape closes.
 * - Scrollable content area with proper flex/minHeight layout.
 * - Responsive via MUI useMediaQuery.
 * - Casino-style visuals: animated gradient, neon glow CTA, floating chips.
 *
 * Replace styling tokens or images to match your brand.
 */

function useCountdown(targetIso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(
    0,
    (targetIso ? new Date(targetIso).getTime() : 0) - now
  );
  const seconds = Math.floor(diff / 1000);
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { d, h, m, s, totalMs: diff };
}

export default function PromoSpotlightModal({
  suppressAutoShow = false,
  autoFetch = true,
}) {
  const api = useApi();

  const [open, setOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const [isPreview, setIsPreview] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    const handlePreview = (e) => {
      const pb = e?.detail;
      if (!pb) return;
      setIsPreview(true);
      setBanner(pb);
      setOpen(true);
    };
    window.addEventListener("promo:preview", handlePreview);
    return () => {
      window.removeEventListener("promo:preview", handlePreview);
    };
  }, []);

  useEffect(() => {
    if (!autoFetch) {
      return undefined;
    }

    let mounted = true;

    (async () => {
      try {
        const { data } = await api.get("/api/v1/config/public");
        const pb = data?.promoBanner;
        if (pb && mounted) {
          setBanner(pb);
          if (pb.enabled && !suppressAutoShow) {
            setOpen(true);
          }
        }
      } catch {
        // ignore fetch errors silently
      }
    })();

    return () => {
      mounted = false;
    };
  }, [api, autoFetch, suppressAutoShow]);

  const countdown = useCountdown(banner?.expiresAt);
  const percent = useMemo(() => {
    if (!banner?.expiresAt) return null;
    const end = new Date(banner.expiresAt).getTime();
    const start = Date.now();
    if (end <= start) return 100;
    return null;
  }, [banner?.expiresAt]);

  const handleClose = () => {
    // only ephemeral close; reopen on reload per request
    setOpen(false);
    if (isPreview) setIsPreview(false);
  };

  if (!banner) return null;

  // parse lines -> paragraph + bullets
  const lines = (banner.body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((l) => l.startsWith("- ") || l.startsWith("• "))
    .map((l) => l.replace(/^[-•]\s*/, ""));
  const paragraph = lines
    .filter((l) => !(l.startsWith("- ") || l.startsWith("• ")))
    .join(" ");

  // theme tokens with sensible defaults
  const headerBg = banner.theme?.headerBg || "#ffd500";
  const headerText = banner.theme?.headerText || "#111";
  const ctaColor = banner.theme?.ctaColor || "#ff6b00";
  const bgStart = banner.theme?.bgStart || "#ff8c00";
  const bgEnd = banner.theme?.bgEnd || "#ff3d00";
  const backgroundStyle = `linear-gradient(135deg, ${bgStart} 0%, ${bgEnd} 100%)`;

  // small helper for floating chips
  const floatingChips = Array.from({ length: 6 }).map((_, i) => ({
    left: `${8 + ((i * 14) % 80)}%`,
    top: `${-10 + ((i * 12) % 40)}%`,
    size: 26 + (i % 3) * 8,
    delay: `${i * 0.6}s`,
  }));

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        // close only on backdrop click or escape
        if (reason === "backdropClick" || reason === "escapeKeyDown")
          handleClose();
      }}
      maxWidth={fullScreen ? false : "sm"}
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      sx={{ zIndex: 2147483647 }}
      BackdropProps={{
        sx: { zIndex: 2147483600, backdropFilter: "blur(3px)" },
      }}
      PaperProps={{
        sx: {
          zIndex: 2147483647,
          position: "relative",
          borderRadius: fullScreen ? 0 : 2,
          overflow: "hidden",
          background: backgroundStyle,
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          maxHeight: fullScreen ? "100vh" : "95vh",
          boxShadow: (t) =>
            `0 20px 60px rgba(0,0,0,${t.palette.mode === "dark" ? 0.8 : 0.5})`,
        },
      }}
      aria-labelledby="promo-spotlight-title"
    >
      {/* floating chips / casino accents */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {floatingChips.map((c, idx) => (
          <Box
            key={idx}
            sx={{
              position: "absolute",
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.12)",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), rgba(255,255,255,0.04))",
              transform: "translateY(-10px)",
              animation: `float-${idx} 6s ease-in-out infinite`,
              opacity: 0.85,
            }}
          />
        ))}
      </Box>

      {/* close - absolute and always on top */}
      <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 2200 }}>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: headerText,
            bgcolor: headerBg,
            "&:hover": { bgcolor: headerBg },
          }}
          aria-label="Close promo"
        >
          <CloseIcon sx={{ color: "white" }} />
        </IconButton>
      </Box>

      <DialogTitle
        id="promo-spotlight-title"
        sx={{
          bgcolor: headerBg,
          color: headerText,
          textAlign: "center",
          pb: 1,
          pt: 2,
        }}
      >
        {/* Use span to avoid nested heading within DialogTitle's default h2 */}
        <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
          {banner.title || "Promo"}
        </Typography>

        {banner.expiresAt && (
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 1, color: headerText }}
          >
            <Box sx={{ textAlign: "center", minWidth: 56 }}>
              <Typography component="p" variant="h5">
                {String(countdown.h).padStart(2, "0")}
              </Typography>
              <Typography variant="caption">Hours</Typography>
            </Box>
            <Box sx={{ textAlign: "center", minWidth: 56 }}>
              <Typography component="p" variant="h5">
                {String(countdown.m).padStart(2, "0")}
              </Typography>
              <Typography variant="caption">Mins</Typography>
            </Box>
            <Box sx={{ textAlign: "center", minWidth: 56 }}>
              <Typography component="p" variant="h5">
                {String(countdown.s).padStart(2, "0")}
              </Typography>
              <Typography variant="caption">Secs</Typography>
            </Box>
          </Stack>
        )}

        {percent != null && (
          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{ mt: 1 }}
          />
        )}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          flex: 1,
          minHeight: 0, // allow proper internal scrolling
          pt: 2,
          px: { xs: 2, sm: 3 },
          maxHeight: fullScreen ? "calc(100vh - 120px)" : "calc(95vh - 160px)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        onClick={(e) => e.stopPropagation()} // ensure clicks inside don't propagate
      >
        {/* main image */}
        {banner.imageUrl && (
          <Box
            sx={{
              my: 1,
              borderRadius: 2,
              boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={getImageUrl(banner.imageUrl)}
              alt="promo"
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
                objectFit: "contain",
              }}
              draggable={false}
            />
          </Box>
        )}

        {/* content */}
        <Typography sx={{ mb: 1.5, fontSize: { xs: 14, sm: 15 } }}>
          {paragraph}
        </Typography>

        {bullets.length > 0 && (
          <Box
            component="ul"
            sx={{
              pl: 3,
              m: 0,
              "& li": { mb: 0.8, fontSize: { xs: 13, sm: 14 } },
            }}
          >
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </Box>
        )}
      </DialogContent>

      {/* CTA area */}
      {banner.action?.url && (
        <DialogActions
          sx={{
            justifyContent: "center",
            py: 2,
            px: 3,
            bgcolor: "transparent",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              // open in new tab reliably without leaving page event handling
              try {
                window.open(banner.action.url, "_blank", "noopener,noreferrer");
              } catch {
                // fallback to href behavior
                window.location.href = banner.action.url;
              }
            }}
            variant="contained"
            sx={{
              fontWeight: 800,
              px: { xs: 3, sm: 5 },
              py: { xs: 1, sm: 1.25 },
              borderRadius: 3,
              background: `linear-gradient(90deg, ${ctaColor}, ${headerBg})`,
              boxShadow:
                "0 8px 30px rgba(0,0,0,0.45), 0 0 20px rgba(255,255,255,0.06) inset",
              transform: "translateZ(0)",
              "&:hover": {
                filter: "brightness(1.02)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              },
              // neon glow
              textShadow: "0 2px 8px rgba(0,0,0,0.35)",
              position: "relative",
              overflow: "visible",
              // pulsing animation
              animation: "pulse-cta 2.2s ease-in-out infinite",
            }}
          >
            {banner.action.label || "Join Now"}
          </Button>
        </DialogActions>
      )}

      {/* styles / keyframes */}
      <style>{`
        @keyframes pulse-cta {
          0% { transform: translateY(0) scale(1); box-shadow: 0 8px 30px rgba(0,0,0,0.45), 0 0 12px rgba(255,255,255,0.04) inset; }
          50% { transform: translateY(-3px) scale(1.02); box-shadow: 0 14px 38px rgba(0,0,0,0.55), 0 0 24px rgba(255,255,255,0.06) inset; }
          100% { transform: translateY(0) scale(1); }
        }
        ${floatingChips
          .map(
            (_, i) => `
          @keyframes float-${i} {
            0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
            50% { transform: translateY(18px) rotate(12deg); opacity: 0.7; }
            100% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          }`
          )
          .join("\n")}
      `}</style>
    </Dialog>
  );
}