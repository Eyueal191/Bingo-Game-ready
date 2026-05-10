import React from 'react';
import { Box } from "@mui/material";
import CardGrid from "./CardGrid";

const CardListGrid = ({
    sortedCards,
    handleSelectCard,
    getBgColor,
    gameStarting,
    userId,
}) => {
    return (
        <Box
            sx={{
                flexGrow: 1,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "#1A0A2E",
                alignItems: "center",
                borderRadius: "10px",
                marginTop: "6px",
                padding: "8px",
            }}
        >
                <CardGrid
                    cards={sortedCards}
                    onSelect={handleSelectCard}
                    getBackgroundColor={getBgColor}
                    gameStarting={gameStarting}
                    userId={userId}
                />
        </Box>
    );
};

export default CardListGrid;
