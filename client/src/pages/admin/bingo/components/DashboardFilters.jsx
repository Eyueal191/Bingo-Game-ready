import React from "react";
import { Box, TextField, Button } from "@mui/material";
import { motion } from "framer-motion";

const DashboardFilters = ({ startDate, setStartDate, endDate, setEndDate, onApply, onClear }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    mb: 4,
                    alignItems: "center",
                }}
            >
                <TextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        bgcolor: "background.default",
                        "& .MuiInputBase-root": {
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            borderRadius: 1,
                        },
                        "& input[type='date']::-webkit-calendar-picker-indicator": {
                            filter: "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                            transform: "scale(1.5)",
                            cursor: "pointer",
                        },
                        flex: 1,
                    }}
                />
                <TextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        bgcolor: "background.default",
                        "& .MuiInputBase-root": {
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            borderRadius: 1,
                        },
                        "& input[type='date']::-webkit-calendar-picker-indicator": {
                            filter: "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                            transform: "scale(1.5)",
                            cursor: "pointer",
                        },
                        flex: 1,
                    }}
                />
                <Button variant="contained" onClick={onApply} sx={{ ml: 2 }}>
                    Apply
                </Button>
                <Button variant="outlined" onClick={onClear} sx={{ ml: 1 }}>
                    Clear
                </Button>
            </Box>
        </motion.div>
    );
};

export default DashboardFilters;
