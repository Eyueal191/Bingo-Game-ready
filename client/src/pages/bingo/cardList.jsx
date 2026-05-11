import { Box, Snackbar, Alert } from "@mui/material";
import { useCardList } from "../../hooks/useCardList";
import { useAuth } from "../../contexts/AuthContext";
import BingoLoading from "../../components/common/BingoLoading";
import {
  CardListHeader,
  CardListGrid,
  CardListFooter
} from "../../components/CardList";
import getCardBgColor from "../../utils/getCardBgColor";

const CardList = () => {
  const {
    sortedCards,
    selectedCards,
    notification,
    clearNotification,
    handleSelectCard,
    handleRefresh,
    handleReserve,
    handleUnrserve,
    counters,
    gameStarting,
    loading,
    roomData,
    wallet,
    bonus,
    userId,
    userReservedCardIds,
    isMultiCardMode,
    isClickToReserve,
    // Play mode
    isManualMode,
    toggleMode,
    hasReservedCards,

    // Win pattern
    winPattern,
    stake,
  } = useCardList();

  const { role } = useAuth();
  const isGuest = role === "guest";

  if (loading) {
    return <BingoLoading message="Loading..." size="large" />;
  }

  const getBgColor = (card) =>
    getCardBgColor(card, selectedCards, userReservedCardIds, userId);

  return (
    <Box className="bg-[#160a29]"
      sx={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 1,
        background: "transparent",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <CardListHeader
        wallet={wallet}
        bonus={bonus}
        stake={stake}
        roomData={roomData}
        counters={counters}
        isManualMode={isManualMode}
        toggleMode={toggleMode}
        hasReservedCards={hasReservedCards}
        winPattern={winPattern}
        handleRefresh={handleRefresh}
      />

      <CardListGrid
        sortedCards={sortedCards}
        handleSelectCard={handleSelectCard}
        getBgColor={getBgColor}
        gameStarting={gameStarting}
        userId={userId}
      />

      <CardListFooter
        selectedCards={selectedCards}
        userReservedCardIds={userReservedCardIds}
        isMultiCardMode={isMultiCardMode}
        isClickToReserve={isClickToReserve}
        isGuest={isGuest}
        handleRefresh={handleRefresh}
        handleReserve={handleReserve}
      />

      <Snackbar
        open={notification.show}
        autoHideDuration={3000}
        onClose={clearNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={clearNotification}
          severity={notification.severity}
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 700 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CardList;