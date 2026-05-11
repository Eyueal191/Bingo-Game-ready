import React from "react";
import { motion } from "framer-motion";

const BingoLoading = ({ 
  message = "Loading game...", 
  subMessage = "",
  variant = "default", 
  size = "medium",
  showProgress = false,
  progress = 0,
  className = ""
}) => {
  const sizeClasses = {
    small: {
      container: "p-4",
      spinner: "w-8 h-8",
      ball: "w-6 h-6",
      text: "text-sm",
      subText: "text-xs",
      spacing: "space-y-3"
    },
    medium: {
      container: "p-6",
      spinner: "w-12 h-12",
      ball: "w-8 h-8",
      text: "text-base",
      subText: "text-sm",
      spacing: "space-y-4"
    },
    large: {
      container: "p-8",
      spinner: "w-16 h-16",
      ball: "w-12 h-12",
      text: "text-lg",
      subText: "text-base",
      spacing: "space-y-6"
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;

  const ballVariants = {
    animate: {
      y: [0, -20, 0],
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  const textVariants = {
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const letterVariants = {
    animate: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const bingoBalls = [
    { letter: "B", color: "bg-red-500", borderColor: "border-red-300" },
    { letter: "I", color: "bg-blue-500", borderColor: "border-blue-300" },
    { letter: "N", color: "bg-green-500", borderColor: "border-green-300" },
    { letter: "G", color: "bg-yellow-500", borderColor: "border-yellow-300" },
    { letter: "O", color: "bg-purple-500", borderColor: "border-purple-300" }
  ];

  const renderBalls = () => (
    <div className="flex items-center justify-center space-x-2">
      {bingoBalls.map((ball, index) => (
        <motion.div
          key={ball.letter}
          className={`${currentSize.ball} ${ball.color} ${ball.borderColor} border-2 rounded-full shadow-lg flex items-center justify-center text-white font-bold text-xs`}
          variants={ballVariants}
          animate="animate"
          style={{
            animationDelay: `${index * 0.15}s`
          }}
        >
          {ball.letter}
        </motion.div>
      ))}
    </div>
  );

  const renderSpinner = () => (
    <motion.div
      className={`${currentSize.spinner} border-4 border-white/20 border-t-yellow-400 border-r-green-400 border-b-blue-400 border-l-red-400 rounded-full relative`}
      variants={spinnerVariants}
      animate="animate"
    >
      <div className="absolute inset-2 bg-gradient-to-br from-yellow-400/20 to-green-400/20 rounded-full"></div>
    </motion.div>
  );

  const renderBingoLetters = () => (
    <div className="flex items-center justify-center space-x-1">
      {bingoBalls.map((ball, index) => (
        <motion.span
          key={ball.letter}
          className={`${ball.color.replace('bg-', 'text-')} font-bold text-lg`}
          variants={letterVariants}
          animate="animate"
          style={{
            animationDelay: `${index * 0.2}s`
          }}
        >
          {ball.letter}
        </motion.span>
      ))}
    </div>
  );

  const renderProgress = () => (
    <div className="w-full max-w-xs">
      <div className="bg-white/20 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="text-center text-white/70 text-xs mt-1">
        {progress}%
      </div>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case "minimal":
        return (
          <>
            {renderSpinner()}
            <motion.div
              className={`${currentSize.text} text-white font-semibold text-center`}
              variants={textVariants}
              animate="animate"
            >
              {message}
            </motion.div>
          </>
        );
      
      case "balls-only":
        return (
          <>
            {renderBalls()}
            <motion.div
              className={`${currentSize.text} text-white font-semibold text-center`}
              variants={textVariants}
              animate="animate"
            >
              {message}
            </motion.div>
          </>
        );
      
      case "spinner-only":
        return (
          <>
            {renderSpinner()}
            <motion.div
              className={`${currentSize.text} text-white font-semibold text-center`}
              variants={textVariants}
              animate="animate"
            >
              {message}
            </motion.div>
          </>
        );
      
      default:
        return (
          <>
            {renderBalls()}
            {renderSpinner()}
            <motion.div
              className={`${currentSize.text} text-white font-semibold text-center`}
              variants={textVariants}
              animate="animate"
            >
              {message}
            </motion.div>
            {subMessage && (
              <motion.div
                className={`${currentSize.subText} text-white/70 text-center`}
                variants={textVariants}
                animate="animate"
              >
                {subMessage}
              </motion.div>
            )}
            {showProgress && renderProgress()}
            {renderBingoLetters()}
          </>
        );
    }
  };

  return (
    <div className={`flex flex-col !items-center !justify-center min-h-screen bg-[#160a29] ${currentSize.spacing} ${currentSize.container} ${className}`}>
      {renderContent()}
    </div>
  );
};

export default BingoLoading;