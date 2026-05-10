import React from "react";
import { Box, Typography, TextField, Grid, Button } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { motion } from "framer-motion";

const IdentityTab = ({ user, username, setUsername, onUpdate, onCopyCode }) => {
    const theme = useTheme();
    return (
        <Box component={motion.div} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 3 } }}>
            <Box>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    Full Name
                </Typography>
                <TextField
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    variant="outlined"
                    sx={{
                        mt: 1,
                        "& .MuiOutlinedInput-root": {
                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                            borderRadius: "12px",
                            color: "text.primary",
                            "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.1) },
                            "&:hover fieldset": { borderColor: theme.palette.primary.main },
                            "&.Mui-focused fieldset": { borderColor: theme.palette.primary.main },
                        },
                    }}
                />
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                        Phone Number
                    </Typography>
                    <TextField
                        fullWidth
                        value={user?.phone || "N/A"}
                        disabled
                        sx={{
                            mt: 1,
                            "& .MuiOutlinedInput-root": {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                borderRadius: "12px",
                                color: "text.primary",
                                "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.15) },
                                "&.Mui-disabled": {
                                    opacity: 1,
                                    color: "text.primary",
                                }
                            },
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                        Email
                    </Typography>
                    <TextField
                        fullWidth
                        value={user?.email || "Not provided"}
                        disabled
                        sx={{
                            mt: 1,
                            "& .MuiOutlinedInput-root": {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                borderRadius: "12px",
                                color: "text.primary",
                                "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.15) },
                                "&.Mui-disabled": {
                                    opacity: 1,
                                    color: "text.primary",
                                }
                            },
                        }}
                    />
                </Grid>
            </Grid>
            <Box>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    Referral Code
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <TextField
                        fullWidth
                        value={user?.referralCode || ""}
                        disabled
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                bgcolor: alpha(theme.palette.text.primary, 0.04),
                                borderRadius: "12px",
                                color: theme.palette.primary.main,
                                "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.15) },
                                "&.Mui-disabled": {
                                    opacity: 1,
                                }
                            },
                        }}
                    />
                    <Button
                        onClick={onCopyCode}
                        variant="outlined"
                        sx={{
                            borderColor: alpha(theme.palette.primary.main, 0.4),
                            color: theme.palette.primary.main,
                            borderRadius: "12px",
                            px: { xs: 2, md: 3 },
                            minWidth: { xs: "auto", md: 64 },
                            "&:hover": { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1) },
                        }}
                    >
                        <ContentCopyIcon sx={{ fontSize: 18 }} />
                    </Button>
                </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                    onClick={onUpdate}
                    variant="contained"
                    sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                        borderRadius: "12px",
                        px: 4,
                        py: 1.5,
                        fontSize: "0.9rem",
                        boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                        "&:hover": { background: `linear-gradient(135deg, ${theme.palette.primary.light || theme.palette.primary.main} 0%, ${theme.palette.primary.main} 100%)`, color: "background.paper" },
                    }}
                >
                    Save Profile
                </Button>
            </Box>
        </Box>
    );
};

export default IdentityTab;
