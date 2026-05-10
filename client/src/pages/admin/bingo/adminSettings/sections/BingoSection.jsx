import React from "react";
import { Button, Grid, Stack, TextField, Typography, Box } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const BingoSection = ({ bingo, setBingo, saving, onSave }) => (
    <SectionCard
        title="Bingo Game Settings"
        subtitle="Configure the bingo game calling behavior."
        footer={
            <Stack direction="row" spacing={2}>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </Stack>
        }
    >
        <Stack spacing={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Number Calling Interval
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        The time in seconds between each bingo number call.
                    </Typography>
                </Box>
                <TextField
                    type="number"
                    label="Seconds"
                    size="small"
                    sx={{ width: 120 }}
                    value={bingo.callInterval || ""}
                    onChange={(e) =>
                        setBingo((prev) => ({
                            ...prev,
                            callInterval: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                    }
                    inputProps={{ min: 1 }}
                />
            </Box>
        </Stack>
    </SectionCard>
);

export default BingoSection;
