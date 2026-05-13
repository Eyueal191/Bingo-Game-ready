const BingoLoading = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#21103D] px-6">

      {/* Spinner Container (responsive sizing) */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">

        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 sm:border-[5px] border-bingo-border animate-spin"></div>

        {/* Accent ring */}
        <div className="absolute inset-2 sm:inset-3 rounded-full border-4 sm:border-[5px] border-t-bingo-accent border-transparent animate-spin-slow"></div>

        {/* Core glow */}
        <div className="absolute inset-6 sm:inset-7 md:inset-8 rounded-full bg-bingo-secondary shadow-lg animate-pulse"></div>

      </div>

      {/* Main text */}
      <p className="mt-6 sm:mt-8 text-white font-extrabold tracking-widest text-lg sm:text-xl md:text-2xl animate-pulse text-center">
        Loading game...
      </p>

      {/* Optional subtle subtitle */}
      <p className="mt-2 text-white/60 text-sm sm:text-base text-center max-w-xs">
        Preparing your bingo experience
      </p>

    </div>
  );
};

export default BingoLoading;