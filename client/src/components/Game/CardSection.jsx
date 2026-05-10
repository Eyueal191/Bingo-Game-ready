import BingoCard from "../../pages/bingo/PlayerCard";

const CardSection = ({ reservedCardIds, liveResults }) => (
  <div className="p-1 rounded-lg shadow-lg w-full md:w-auto flex flex-col md:flex-row justify-center gap-1">
    {reservedCardIds.length > 0 ? (
      reservedCardIds.map((cardId, index) => (
        <BingoCard key={index} cardId={cardId} liveResults={liveResults} />
      ))
    ) : (
      <p>Waiting for game</p>
    )}
  </div>
);

export default CardSection;