import CountdownDisplay from "./CountdownDisplay";

export default function CardCounter({ counterValue }) {
  const formatCounter = (value) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    counterValue !== undefined && counterValue > 0 && (
      <div className="text-center mt-2">
        <p className="text-lg sm:text-xl font-bold text-yellow-800 shadow-[0_0_8px_rgba(255,204,0,1)]">
          <CountdownDisplay variant="body1">
            {formatCounter(counterValue)}
          </CountdownDisplay>
        </p>
      </div>
    )
  );
}
