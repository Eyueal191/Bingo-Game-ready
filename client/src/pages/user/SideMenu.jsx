import React from "react";
import { Button, Typography } from "@mui/material";
import { Download, Upload, History, Wallet, CreditCard } from "lucide-react";

const SideMenu = ({ activeOption = "deposit", onOptionClick }) => {
  const menuOptions = [
    { id: "deposit", label: "Deposit", icon: Download },
    { id: "withdraw", label: "Withdraw", icon: Upload },
    { id: "transfer", label: "Transfer", icon: CreditCard },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="flex flex-row md:flex-col gap-2 md:gap-3 bg-white/5 backdrop-blur-md rounded-xl p-2 md:p-4 border border-white/5 shadow-2xl">
      {menuOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeOption === option.id;

        return (
          <Button
            key={option.id}
            onClick={() => onOptionClick(option.id)}
            sx={{
              flex: { xs: 1, md: "none" },
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: { xs: "center", md: "flex-start" },
              px: { xs: 1, md: 2.5 },
              py: { xs: 1.5, md: 2 },
              borderRadius: 2.5,
              textTransform: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: isActive ? "#55ff77" : "transparent",
              color: isActive ? "#0f1221" : "rgba(255, 255, 255, 0.6)",
              border: isActive ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
              "&:hover": {
                bgcolor: isActive ? "#55ff77" : "rgba(255, 255, 255, 0.1)",
                color: isActive ? "#0f1221" : "white",
                transform: "translateY(-2px)",
              },
              "& .lucide": {
                mr: { xs: 0, md: 1.5 },
                mb: { xs: 0.5, md: 0 },
                width: { xs: 18, md: 20 },
                height: { xs: 18, md: 20 },
              }
            }}
          >
            <Icon />
            <Typography
              variant="button"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.85rem" },
                letterSpacing: "0.5px"
              }}
            >
              {option.label}
            </Typography>
          </Button>
        );
      })}
    </div>
  );
};

export default SideMenu;
