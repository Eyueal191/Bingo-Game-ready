import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, Select, MenuItem, Button
} from "@mui/material";
import toast from "react-hot-toast";
import { ROLES } from "../constants";

const RoleDialog = ({ open, user, onClose, onUpdate, api }) => {
    const [selectedRole, setSelectedRole] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role || "user");
        }
    }, [user]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await api.put(`/api/v1/users/${user._id}/role`, {
                role: selectedRole,
            });
            toast.success(`User role updated to ${selectedRole}`);
            onUpdate();
            onClose();
        } catch (error) {
            toast.error("Failed to update user role");
            console.error("Update user role error:", error);
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
            <DialogTitle>Change Role for {user?.fullName}</DialogTitle>
            <DialogContent>
                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                        value={selectedRole}
                        label="Role"
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        {ROLES.map((role) => (
                            <MenuItem key={role.value} value={role.value}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RoleDialog;
