import { Box, Typography, TextField, InputAdornment, IconButton, Button } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { motion } from "framer-motion";

const SecurityTab = ({
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    onChangePassword,
    isMobile,
}) => {
    const theme = useTheme();
    return (
        <Box component={motion.div} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 3 } }}>
            <Box>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    Current Password
                </Typography>
                <TextField
                    fullWidth
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="off"
                    sx={{
                        mt: 1,
                        "& .MuiOutlinedInput-root": {
                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                            borderRadius: "12px",
                            color: "text.primary",
                            "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.1) },
                            "&:hover fieldset": { borderColor: theme.palette.primary.main },
                        },
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} size="small" sx={{ color: alpha(theme.palette.text.primary, 0.5) }}>
                                    {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <Box>
                <Typography variant="caption" sx={{ color: alpha(theme.palette.text.primary, 0.5), textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                    New Password
                </Typography>
                <TextField
                    fullWidth
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    sx={{
                        mt: 1,
                        "& .MuiOutlinedInput-root": {
                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                            borderRadius: "12px",
                            color: "text.primary",
                            "& fieldset": { borderColor: alpha(theme.palette.text.primary, 0.1) },
                            "&:hover fieldset": { borderColor: theme.palette.primary.main },
                        },
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowNewPassword(!showNewPassword)} size="small" sx={{ color: alpha(theme.palette.text.primary, 0.5) }}>
                                    {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" }, mt: 2 }}>
                <Button
                    onClick={onChangePassword}
                    variant="contained"
                    fullWidth={isMobile}
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
                    Change Password
                </Button>
            </Box>
        </Box>
    );
};

export default SecurityTab;
