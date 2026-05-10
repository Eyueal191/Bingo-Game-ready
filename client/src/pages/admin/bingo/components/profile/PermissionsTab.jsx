import { Box, Typography, Chip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { motion } from "framer-motion";
import { VerifiedUser as AdminIcon, LockOpen as AccessIcon } from "@mui/icons-material";

const PermissionsTab = ({ user, role }) => {
    const theme = useTheme();
    const permissions = user?.gamePermissions || {};
    const activePermissions = Object.entries(permissions).filter(([_, value]) => value);

    return (
        <Box component={motion.div} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <Typography variant="body2" sx={{ color: alpha(theme.palette.text.primary, 0.5), mb: { xs: 2, md: 3 } }}>
                Your account has the following module permissions enabled:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {activePermissions.length > 0 ? (
                    activePermissions.map(([key, value]) => (
                        <Chip
                            key={key}
                            icon={<AccessIcon sx={{ fontSize: "0.9rem !important", color: "inherit" }} />}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: theme.palette.primary.main,
                                fontWeight: 700,
                                borderRadius: "10px",
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                "& .MuiChip-label": { px: { xs: 1.5, md: 2 }, py: 1, fontSize: { xs: "0.75rem", md: "0.85rem" } },
                            }}
                        />
                    ))
                ) : (
                    <Typography variant="body2" sx={{ color: alpha(theme.palette.text.primary, 0.3), fontStyle: "italic" }}>
                        No specific module permissions assigned.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default PermissionsTab;
