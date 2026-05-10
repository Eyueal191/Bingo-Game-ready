import React from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Paper,
    Stack,
    Chip
} from "@mui/material";

const LudoSection = ({ ludo, setLudo, saving, onSave }) => {
    const [stakeInput, setStakeInput] = React.useState("");

    const handleAddStake = () => {
        const val = Number(stakeInput);
        if (!isNaN(val) && val > 0 && !ludo.stakes.includes(val)) {
            setLudo({ ...ludo, stakes: [...ludo.stakes, val].sort((a, b) => a - b) });
        }
        setStakeInput("");
    };

    const handleRemoveStake = (stakeToRemove) => {
        setLudo({
            ...ludo,
            stakes: ludo.stakes.filter((s) => s !== stakeToRemove),
        });
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
                Ludo Configuration
            </Typography>

            <Stack spacing={4}>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Game Modes Enable/Disable</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Toggle which Ludo modes are globally available to players.
                    </Typography>
                    <Stack direction="row" spacing={4}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ludo.classicModeEnabled}
                                    onChange={(e) =>
                                        setLudo({ ...ludo, classicModeEnabled: e.target.checked })
                                    }
                                />
                            }
                            label="Classic Mode (4 Tokens)"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ludo.quickModeEnabled}
                                    onChange={(e) =>
                                        setLudo({ ...ludo, quickModeEnabled: e.target.checked })
                                    }
                                />
                            }
                            label="Quick Mode (2 Tokens)"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ludo.sprintModeEnabled ?? true}
                                    onChange={(e) =>
                                        setLudo({ ...ludo, sprintModeEnabled: e.target.checked })
                                    }
                                />
                            }
                            label="Sprint Mode (1 Token)"
                        />
                    </Stack>
                </Box>

                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">System Settings</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Global settings for the Ludo game engine.
                    </Typography>
                    <Box sx={{ maxWidth: 300 }}>
                        <TextField
                            fullWidth
                            label="System Commission (%)"
                            type="number"
                            size="small"
                            value={ludo.commissionPercent ?? 10}
                            onChange={(e) => setLudo({ ...ludo, commissionPercent: Number(e.target.value) })}
                            helperText="Percentage of total pot taken by platform"
                            InputProps={{ inputProps: { min: 0, max: 100 } }}
                        />
                    </Box>
                </Box>

                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Available Stakes</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Manage the list of coins bet amounts players can choose from when creating rooms.
                    </Typography>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
                        {ludo.stakes.map((stake) => (
                            <Chip
                                key={stake}
                                label={`${stake} coins`}
                                onDelete={() => handleRemoveStake(stake)}
                                color="primary"
                                variant="outlined"
                            />
                        ))}
                        {ludo.stakes.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                No stakes configured. Players won't be able to bet!
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            size="small"
                            type="number"
                            label="New Stake (coins)"
                            value={stakeInput}
                            onChange={(e) => setStakeInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddStake()}
                        />
                        <Button variant="outlined" onClick={handleAddStake}>
                            Add Stake
                        </Button>
                    </Stack>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={onSave}
                        disabled={saving}
                        sx={{ px: 4 }}
                    >
                        {saving ? "Saving..." : "Save Ludo Settings"}
                    </Button>
                </Box>
            </Stack>
        </Paper>
    );
};

export default LudoSection;
