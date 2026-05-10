import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";
import { Star, CheckCircle } from "lucide-react";

const TransactionCard = ({
  type,
  title,
  logo,
  isFeatured = false,
  isSelected = false,
  onClick,
}) => {
  return (
    <Card
      sx={{
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        bgcolor: isSelected ? "rgba(85, 255, 119, 0.08)" : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${isSelected ? "#55ff77" : "rgba(255, 255, 255, 0.1)"}`,
        backdropFilter: "blur(10px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          bgcolor: isSelected ? "rgba(85, 255, 119, 0.12)" : "rgba(255, 255, 255, 0.06)",
          boxShadow: isSelected ? "0 8px 24px rgba(85, 255, 119, 0.2)" : "0 8px 24px rgba(0, 0, 0, 0.2)",
        }
      }}
      onClick={onClick}
    >
      {isFeatured && (
        <Box sx={{ position: "absolute", top: 8, left: 8, zIndex: 10 }}>
          <Star size={16} color="#f8d517" fill="#f8d517" />
        </Box>
      )}
      {isSelected && (
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <CheckCircle size={20} color="#55ff77" />
        </Box>
      )}
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {logo ? (
            <Box
              component="img"
              src={logo}
              alt={title}
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                objectFit: "contain",
                borderRadius: 1.5,
                bgcolor: "white",
                p: 0.5
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: 40, sm: 48 },
                height: { xs: 40, sm: 48 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1.5,
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.8rem"
              }}
            >
              {title?.substring(0, 3).toUpperCase()}
            </Box>
          )}
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600, fontSize: { xs: "0.9rem", sm: "1rem" } }}>
              {title}
            </Typography>
            {isFeatured && (
              <Typography variant="caption" sx={{ color: "#55ff77", fontWeight: 500, display: "block", mt: 0.2 }}>
                Recommended
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransactionCard;
