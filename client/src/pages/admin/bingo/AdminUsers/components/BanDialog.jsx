import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button
} from "@mui/material";
import toast from "react-hot-toast";

const BanDialog = ({ open, user, mode, onClose, onUpdate, api }) => {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const url = `/api/v1/users/${user._id}/${mode}`;
            await api.put(
                url,
                mode === "ban" ? { reason: reason || "Admin action" } : {}
            );
            toast.success(mode === "ban" ? "User banned" : "User unbanned");
            onUpdate();
            onClose();
        } catch (e) {
            toast.error("Failed to update status");
            console.error(e);
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
        >
            <DialogTitle>
                {mode === "ban"
                    ? `Ban ${user?.fullName || "user"}`
                    : `Unban ${user?.fullName || "user"}`}
            </DialogTitle>
            <DialogContent>
                {mode === "ban" && (
                    <TextField
                        label="Reason (optional)"
                        fullWidth
                        margin="normal"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                    variant="contained"
                    color={mode === "ban" ? "error" : "warning"}
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (mode === "ban" ? "Banning..." : "Unbanning...") : (mode === "ban" ? "Ban" : "Unban")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BanDialog;
