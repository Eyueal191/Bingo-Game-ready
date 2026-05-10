
const WatcherOverlay = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <svg
        className="absolute w-[115%] h-[115%] text-red-500 drop-shadow-[0_0_16px_rgba(220,38,38,0.45)]"
        viewBox="0 0 200 200"
      >
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="18"
        />
        <line
          x1="52"
          y1="52"
          x2="148"
          y2="148"
          stroke="currentColor"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <line
          x1="148"
          y1="52"
          x2="52"
          y2="148"
          stroke="currentColor"
          strokeWidth="20"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute bottom-2 px-2 text-center text-[10px] font-black uppercase tracking-[0.4em] text-red-100 drop-shadow-lg">
        Watching Only
      </span>
    </div>
  );
};

export default WatcherOverlay;