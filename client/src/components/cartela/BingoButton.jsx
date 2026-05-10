const BingoButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--color-bingo-secondary)",
        boxShadow: "0 4px 0 var(--color-bingo-secondary)",
        color: "white",
      }}
      className="w-full mt-2 hover:bg-bingo-secondary text-sm font-black py-2 rounded-lg active:shadow-none active:translate-y-1 transition-all duration-100 uppercase tracking-widest border-none"
    >
      BINGO
    </button>
  );
};

export default BingoButton;