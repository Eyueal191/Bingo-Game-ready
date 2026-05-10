import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    TextField,
} from "@mui/material";

const ConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    title = "Confirm",
    description = "Are you sure?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    confirmColor = "error",
    loading = false,
    showReason = false,
    reasonLabel = "Reason",
    reasonValue = "",
    onReasonChange,
    maxWidth = "xs",
    fullWidth = true,
    disableCloseWhileLoading = true,
}) => {
    const handleClose = () => {
        if (loading && disableCloseWhileLoading) return;
        onClose?.();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth={maxWidth} fullWidth={fullWidth}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                {description ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {description}
                    </Typography>
                ) : null}
                {showReason ? (
                    <TextField
                        autoFocus
                        margin="normal"
                        label={reasonLabel}
                        value={reasonValue}
                        onChange={(e) => onReasonChange?.(e.target.value)}
                        fullWidth
                        disabled={loading}
                    />
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    {cancelLabel}
                </Button>
                <Button
                    variant="contained"
                    color={confirmColor}
                    onClick={onConfirm}
                    disabled={loading}
                >
                    {loading ? "Processing..." : confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;