import React from 'react';
import { Box, Button, Typography, Container } from "@mui/material";
import ViewSelectedCards from "./ViewSelectedCard";

const CardListFooter = ({
    selectedCards,
    userReservedCardIds,
    isMultiCardMode,
    isClickToReserve,
    isGuest,
    handleRefresh,
    handleReserve,
}) => {
    const hasSelectedCards = selectedCards.length > 0 || (userReservedCardIds && userReservedCardIds.length > 0);
    const hasButtons = isMultiCardMode && !isClickToReserve;

    if (!hasSelectedCards && !hasButtons) return null;

    return (
        <Box sx={{
            flexShrink: 0,
            zIndex: 20,
            width: "100%",
            bgcolor: "var(--color-bingo-bg)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid var(--color-bingo-border)",
        }}>
            {/* Selected Cards */}
            {hasSelectedCards && (
                <Box
                    className="bg-bingo-bg"
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: "auto",
                        flexShrink: 0,
                        overflow: "hidden",
                    }}
                >
                    <ViewSelectedCards
                        selectedCards={selectedCards}
                        userReservedCardIds={userReservedCardIds}
                    />
                </Box>
            )}

            {/* Buttons */}
            {hasButtons && (
                <Box
                    sx={{
                        bgcolor: "var(--color-bingo-bg)",
                        backdropFilter: "blur(6px)",
                        py: 1,
                        px: 2,
                    }}
                >
                    <Container maxWidth="lg" sx={{ display: "flex", justifyContent: "center" }}>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 2,
                                width: "100%",
                                justifyContent: "center",
                            }}
                        >
                            <Button
                                variant="contained"
                                fullWidth
                                sx={{
                                    backgroundColor: "var(--color-bingo-secondary)",
                                    borderRadius: "12px",
                                    flex: "1 1 150px",
                                    minWidth: "120px",
                                    height: "48px",
                                    fontWeight: 900,
                                    boxShadow: "0 4px 0 #d35400",
                                    '&:hover': {
                                        backgroundColor: "#e67e22",
                                    }
                                }}
                                onClick={handleRefresh}
                            >
                                <Typography variant="button" sx={{ color: "white", fontSize: '0.9rem' }}>
                                    Refresh
                                </Typography>
                            </Button>

                            {!isGuest && (
                                <Button
                                    variant="contained"
                                    fullWidth
                                    sx={{
                                        backgroundColor: "#27ae60",
                                        borderRadius: "12px",
                                        flex: "1 1 150px",
                                        minWidth: "120px",
                                        height: "48px",
                                        fontWeight: 900,
                                        boxShadow: "0 4px 0 #1e8449",
                                        '&:hover': {
                                            backgroundColor: "#2ecc71",
                                        }
                                    }}
                                    onClick={handleReserve}
                                    disabled={selectedCards.length === 0}
                                >
                                    <Typography variant="button" sx={{ color: "white", fontSize: '0.9rem' }}>
                                        Reserve
                                    </Typography>
                                </Button>
                            )}
                        </Box>
                    </Container>
                </Box>
            )}
        </Box>
    );
};

export default CardListFooter;
