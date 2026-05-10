import { Button } from "@mui/material";
import { Download, Upload, History } from "lucide-react";

const SideMenu = ({ activeOption = "deposit", onOptionClick }) => {
  const menuOptions = [
    { id: "deposit", label: "Deposit", icon: Download },
    { id: "withdraw", label: "Withdraw", icon: Upload },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="flex flex-row md:flex-col gap-2 md:gap-3 rounded-lg p-2 md:p-4 shadow-lg">
      {menuOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeOption === option.id;

        return (
          <Button
            key={option.id}
            variant="contained"
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start px-2 py-2 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 ${
              isActive
                ? "bg-linear-to-r from-purple-600 to-indigo-600 text-white! shadow-md"
                : "text-white! font-black hover:text-white!"
            }`}
            onClick={() => onOptionClick(option.id)}
          >
            <Icon size={20} className="mb-1 md:mb-0 md:mr-2" />
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default SideMenu;
