import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Divider,
    Stack,
} from "@mui/material";

const ReservationConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    selectedCards = [],
    stakeAmount = 0,
}) => {
    const totalCost = selectedCards.length * stakeAmount;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { borderRadius: 3, minWidth: 320 }
            }}
        >
            <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
                Confirm Reservation
            </DialogTitle>

            <DialogContent>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                    You are about to reserve {selectedCards.length} card{selectedCards.length !== 1 ? "s" : ""}.
                </Typography>

                <Box
                    sx={{
                        bgcolor: "action.hover",
                        p: 2,
                        borderRadius: 2,
                        mb: 2,
                        display: "flex",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: 1
                    }}
                >
                    {selectedCards.map((cardId) => (
                        <Chip
                            key={cardId}
                            label={`#${cardId}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ bgcolor: "background.paper" }}
                        />
                    ))}
                </Box>

                <Stack spacing={1.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography color="text.secondary">Stake per card</Typography>
                        <Typography fontWeight={500}>{stakeAmount} coins</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography color="text.secondary">Total Cards</Typography>
                        <Typography fontWeight={500}>{selectedCards.length}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="subtitle1" fontWeight={700}>Total Cost</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                            {totalCost} coins
                        </Typography>
                    </Box>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, justifyContent: "center", gap: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    color="inherit"
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="primary"
                    autoFocus
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    Confirm & Pay
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReservationConfirmDialog;
