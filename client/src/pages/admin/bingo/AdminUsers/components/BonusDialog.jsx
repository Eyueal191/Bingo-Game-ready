import React, { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box
} from "@mui/material";
import toast from "react-hot-toast";

const BonusDialog = ({ open, user, api, onClose, onUpdate }) => {
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const amt = Number(amount);
        if (!amount || isNaN(amt) || amt === 0) {
            return toast.error("Please enter a valid non-zero amount");
        }
        if (!reason || reason.trim().length < 3) {
            return toast.error("Please provide a reason (min 3 chars)");
        }

        try {
            setLoading(true);
            await api.put(`/api/v1/users/${user._id}/bonus`, {
                amount: amt,
                reason: reason.trim(),
                source: "manual",
            });
            toast.success("Bonus updated successfully");
            onUpdate?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update bonus");
            console.error("Update bonus error:", error);
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
                    bgcolor: "secondary.main",
                    color: "white",
                    fontSize: { xs: "1rem", sm: "1.25rem" },
                    fontWeight: "bold",
                }}
            >
                Update Bonus for {user?.fullName || "User"}
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 1, sm: 2 }, mt: 1, bgcolor: "background.default" }}>
                <TextField
                    label="Amount to Add/Subtract (coins)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="e.g., 50 or -50"
                    sx={{
                        "& .MuiInputBase-root": { borderRadius: 1 },
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
                    placeholder="e.g., Promotion bonus, manual fix, etc."
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Button onClick={onClose} disabled={loading} color="inherit">
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="secondary"
                    disabled={loading}
                    sx={{ minWidth: 100 }}
                >
                    {loading ? "Updating..." : "Update Bonus"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BonusDialog;
