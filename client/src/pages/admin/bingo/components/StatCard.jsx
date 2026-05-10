import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, color, background }) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <Card
                sx={{
                    background: background || "background.paper",
                    color: color || "text.primary",
                    borderRadius: 2,
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
                }}
            >
                <CardContent>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Box>
                            <Typography variant="overline" sx={{ opacity: 0.8 }}>
                                {title}
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                                {value}
                            </Typography>
                        </Box>
                        {Icon && <Icon sx={{ fontSize: 40, opacity: 0.8 }} />}
                    </Box>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default StatCard;
