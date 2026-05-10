import React from "react";
import { Card, CardContent } from "@mui/material";
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
      className={`cursor-pointer relative overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
        isSelected ? "border-2 border-purple-400 bg-purple-900/30" : ""
      }`}
      onClick={onClick}
    >
      {isFeatured && (
        <div className="absolute top-2 left-2 z-10">
          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle className="text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      )}
      <CardContent className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {logo ? (
            <img
              src={logo}
              alt={title}
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain transition-transform duration-300"
            />
          ) : (
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
              <span className="text-sm sm:text-base">{title}</span>
            </div>
          )}
          <div>
            <h3 className="font-medium text-sm sm:text-base">
              {title}
            </h3>
            {isFeatured && (
              <p className="text-xs sm:text-sm text-green-400">
                Better Transaction Fee
              </p>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm">select to transfer</p>
      </CardContent>
    </Card>
  );
};

export default TransactionCard;
