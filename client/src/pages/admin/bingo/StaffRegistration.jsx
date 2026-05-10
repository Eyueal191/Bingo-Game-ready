import React, { useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Grid,
    CircularProgress,
    InputAdornment,
    alpha,
} from "@mui/material";
import {
    PersonAdd as PersonAddIcon,
    Badge as BadgeIcon,
    Phone as PhoneIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Security as SecurityIcon,
} from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { usePhoneValidation } from "../../../utils/phoneUtils";

const StaffRegistration = () => {
    const api = useApi();
    const { validatePhone } = usePhoneValidation();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        password: "",
        email: "",
        role: "secretary",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.fullName || !formData.phone || !formData.password) {
            return toast.error("Please fill in all required fields");
        }

        setLoading(true);
        try {
            // Validate phone using multi-country system
            const phoneValidation = validatePhone(formData.phone.trim());
            if (!phoneValidation.isValid) {
                return toast.error(phoneValidation.error);
            }

            // Normalize email: send undefined if empty to avoid backend 400
            const submissionData = {
                ...formData,
                phone: phoneValidation.phone,
                email: formData.email.trim() || undefined
            };

            const res = await api.post("/api/v1/auth/admin/register-staff", submissionData);
            if (res.data.success || res.status === 201) {
                toast.success(`Staff member ${formData.fullName} successfully registered!`);
                setFormData({
                    fullName: "",
                    phone: "",
                    password: "",
                    email: "",
                    role: "secretary",
                });
            } else {
                toast.error(res.data.message || "Failed to register staff member");
            }
        } catch (error) {
            console.error("Staff registration error:", error);
            toast.error(error.response?.data?.message || "Error registering staff member");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            sx={{
                maxWidth: 1200,
                mx: "auto",
                p: { xs: 2, sm: 4 },
                width: "100%"
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, sm: 6 },
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                    overflow: "hidden",
                    position: "relative"
                }}
            >
                {/* Header Decoration */}
                <Box
                    sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 6,
                        background: "linear-gradient(90deg, #116e51, #ff3b30, #ff3b30)",
                    }}
                />

                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: "primary.main",
                                display: "flex"
                            }}
                        >
                            <PersonAddIcon fontSize="large" />
                        </Box>
                        <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: "-0.03em" }}>
                            Register Staff
                        </Typography>
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                        Create a new administrative account with specific system roles and permissions.
                    </Typography>
                </Box>

                <form onSubmit={handleSubmit}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                name="fullName"
                                variant="outlined"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                placeholder="Enter full name"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <BadgeIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="09..."
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PhoneIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Email address (Optional)"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="name@example.com"
                                helperText="Used for verification"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                label="Initialization Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Min 6 characters"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={12} md={8}>
                            <FormControl fullWidth required variant="outlined">
                                <InputLabel>Account Role & Permissions</InputLabel>
                                <Select
                                    name="role"
                                    value={formData.role}
                                    label="Account Role & Permissions"
                                    onChange={handleChange}
                                    startAdornment={
                                        <InputAdornment position="start" sx={{ mr: 1 }}>
                                            <SecurityIcon color="action" />
                                        </InputAdornment>
                                    }
                                >
                                    <MenuItem value="secretary">
                                        <Box sx={{ py: 0.5 }}>
                                            <Typography variant="body1" fontWeight="600">Secretary — Operations</Typography>
                                            <Typography variant="caption" color="text.secondary">Manage receipts, withdrawals, and notifications</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="finance">
                                        <Box sx={{ py: 0.5 }}>
                                            <Typography variant="body1" fontWeight="600">Finance — Accounting</Typography>
                                            <Typography variant="caption" color="text.secondary">Revenue, transactions, bonuses, and wallet logs</Typography>
                                        </Box>
                                    </MenuItem>
                                    <MenuItem value="manager">
                                        <Box sx={{ py: 0.5 }}>
                                            <Typography variant="body1" fontWeight="600">Manager — Full Access</Typography>
                                            <Typography variant="caption" color="text.secondary">Full control over games, users, robots, and leaderboards</Typography>
                                        </Box>
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        minWidth: { xs: "100%", sm: 300 },
                                        py: 2,
                                        fontSize: "1.05rem",
                                        fontWeight: "800",
                                        borderRadius: 3,
                                        textTransform: "none",
                                        background: "linear-gradient(135deg, #116e51 0%, #ff3b30 100%)",
                                        boxShadow: "0 4px 14px 0 rgba(17, 110, 81, 0.39)",
                                        "&:hover": {
                                            background: "linear-gradient(135deg, #116e51 0%, #116e51 100%)",
                                            boxShadow: "0 6px 20px rgba(17, 110, 81, 0.45)",
                                            transform: "translateY(-2px)",
                                        },
                                        transition: "all 0.3s ease",
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} color="inherit" /> : "Register Staff Member"}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </form>
            </Paper>

            <Box
                sx={{
                    mt: 4,
                    p: 4,
                    borderRadius: 4,
                    bgcolor: (theme) => alpha(theme.palette.info.main, 0.03),
                    border: "1px dashed",
                    borderColor: (theme) => alpha(theme.palette.info.main, 0.2),
                }}
            >
                <Typography variant="subtitle1" gutterBottom fontWeight="800" color="primary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SecurityIcon fontSize="small" /> System Security Policy
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Selecting a role grants significant system privileges. Please ensure the staff member is authorized for the selected operational scope before proceeding with registration.
                </Typography>
            </Box>
        </Box>
    );
};

export default StaffRegistration;
