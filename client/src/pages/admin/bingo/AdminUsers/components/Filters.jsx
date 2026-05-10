import React from "react";
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Button } from "@mui/material";

const Filters = ({ filters: gridFilters, setFilters: setGridFilters, refresh, isMobile }) => {
    return (
        <Box
            sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            <TextField
                label="Search by Name, Phone, Referral, or Invited By"
                value={gridFilters?.search || ""}
                onChange={(e) =>
                    setGridFilters((f) => ({ ...f, search: e.target.value }))
                }
                sx={{
                    flexGrow: 1,
                    bgcolor: "background.default",
                    "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                }}
            />
            <TextField
                name="startDate"
                label="Start Date"
                type="date"
                value={gridFilters?.startDate || ""}
                onChange={(e) =>
                    setGridFilters((f) => ({ ...f, startDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                sx={{
                    width: 150,
                    bgcolor: "background.default",
                    "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                    "& input[type='date']::-webkit-calendar-picker-indicator": {
                        filter: "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                        transform: "scale(1.5)",
                        cursor: "pointer",
                    },
                }}
            />
            <TextField
                name="endDate"
                label="End Date"
                type="date"
                value={gridFilters?.endDate || ""}
                onChange={(e) =>
                    setGridFilters((f) => ({ ...f, endDate: e.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                sx={{
                    width: 150,
                    bgcolor: "background.default",
                    "& .MuiInputBase-root": { fontSize: "1rem", borderRadius: 1 },
                    "& input[type='date']::-webkit-calendar-picker-indicator": {
                        filter: "invert(40%) sepia(100%) saturate(2000%) hue-rotate(200deg)",
                        transform: "scale(1.5)",
                        cursor: "pointer",
                    },
                }}
            />
            <FormControl sx={{ minWidth: 120 }}>
                <InputLabel size="small">Role</InputLabel>
                <Select
                    size="small"
                    label="Role"
                    value={gridFilters?.role || ""}
                    onChange={(e) =>
                        setGridFilters((f) => ({ ...f, role: e.target.value }))
                    }
                >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="agent">Agent</MenuItem>
                    <MenuItem value="game_manager">Game Manager</MenuItem>
                    <MenuItem value="secretary">Secretary</MenuItem>
                    <MenuItem value="finance">Finance</MenuItem>
                    <MenuItem value="manager">Manager</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="guest">Guest</MenuItem>
                </Select>
            </FormControl>
            <Button
                variant="contained"
                onClick={() => refresh()}
                size="medium"
                sx={{ fontSize: "0.875rem", px: 2, minWidth: 100 }}
            >
                Apply
            </Button>
            <Button
                variant="outlined"
                onClick={() =>
                    setGridFilters({ startDate: "", endDate: "", search: "", role: "" })
                }
                size="medium"
                sx={{ fontSize: "0.875rem", px: 2, minWidth: 100 }}
            >
                Clear
            </Button>
        </Box>
    );
};

export default Filters;
