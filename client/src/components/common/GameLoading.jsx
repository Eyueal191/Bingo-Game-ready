import React from "react";
import { motion } from "framer-motion";

const GameLoading = ({ 
  message = "Loading...", 
  size = "medium",
  showSpinner = true,
  showBalls = true,
  className = ""
}) => {
  const sizeClasses = {
    small: {
      container: "p-4",
      spinner: "w-8 h-8",
      ball: "w-6 h-6",
      text: "text-sm",
      spacing: "space-y-3"
    },
    medium: {
      container: "p-6",
      spinner: "w-12 h-12",
      ball: "w-8 h-8",
      text: "text-base",
      spacing: "space-y-4"
    },
    large: {
      container: "p-8",
      spinner: "w-16 h-16",
      ball: "w-12 h-12",
      text: "text-lg",
      spacing: "space-y-6"
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;

  const ballVariants = {
    animate: {
      y: [0, -20, 0],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const textVariants = {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const ballColors = [
    "bg-red-500",
    "bg-blue-500", 
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500"
  ];

  return (
    <div className={`flex flex-col items-center justify-center ${currentSize.spacing} ${currentSize.container} ${className}`}>
      {/* Bingo Balls Animation */}
      {showBalls && (
        <div className="flex items-center justify-center space-x-2">
          {ballColors.map((color, index) => (
            <motion.div
              key={index}
              className={`${currentSize.ball} ${color} rounded-full shadow-lg border-2 border-white/20`}
              variants={ballVariants}
              animate="animate"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Spinner */}
      {showSpinner && (
        <motion.div
          className={`${currentSize.spinner} border-4 border-white/20 border-t-yellow-400 border-r-green-400 rounded-full`}
          variants={spinnerVariants}
          animate="animate"
        />
      )}

      {/* Loading Message */}
      <motion.div
        className={`${currentSize.text} text-white font-semibold text-center`}
        variants={textVariants}
        animate="animate"
      >
        {message}
      </motion.div>

    </div>
  );
};

export default GameLoading;