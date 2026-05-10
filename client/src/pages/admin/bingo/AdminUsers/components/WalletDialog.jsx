import React, { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, TextField, Button, Box
} from "@mui/material";
import toast from "react-hot-toast";

const WalletDialog = ({ open, user, onClose, onUpdate, api }) => {
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!amount || isNaN(amount)) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (!reason || reason.trim().length < 3) {
            toast.error("Please provide a short reason (min 3 chars)");
            return;
        }

        try {
            setLoading(true);
            await api.put(`/api/v1/users/${user._id}/wallet`, {
                amount: Number(amount),
                reason: reason.trim(),
                source: "manual",
            });
            toast.success("Wallet updated successfully");
            onUpdate();
            onClose();
        } catch (error) {
            toast.error("Failed to update wallet");
            console.error("Update wallet error:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
        >
            <DialogTitle
                sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    fontSize: { xs: "1rem", sm: "1.25rem" },
                    fontWeight: "bold",
                }}
            >
                Update Wallet for {user?.fullName || "User"}
            </DialogTitle>
            <DialogContent
                sx={{ p: { xs: 1, sm: 2 }, bgcolor: "background.default" }}
            >
                <TextField
                    label="Amount to Add (coins)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    margin="normal"
                    inputProps={{ min: 0 }}
                    sx={{
                        "& .MuiInputBase-root": {
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            borderRadius: 1,
                        },
                        "& .MuiInputLabel-root": { color: "text.secondary" },
                        "& .MuiInputBase-input": { color: "text.primary" },
                    }}
                />

                <TextField
                    label="Reason (required)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    fullWidth
                    margin="normal"
                    multiline
                    minRows={2}
                    placeholder="e.g., Compensation for failed game, manual correction, etc."
                />
            </DialogContent>
            <DialogActions
                sx={{
                    p: { xs: 1, sm: 2 },
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Button
                    onClick={onClose}
                    disabled={loading}
                    sx={{
                        color: "error.main",
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleUpdate}
                    variant="contained"
                    disabled={loading}
                    sx={{
                        bgcolor: "success.main",
                        "&:hover": { bgcolor: "success.dark" },
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        minWidth: 100,
                    }}
                >
                    {loading ? "Updating..." : "Add Amount"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WalletDialog;
