import React from "react";
import { Button, Grid, Stack, Switch, Typography, Box, Divider } from "@mui/material";
import { Save as SaveIcon, Leaderboard as LeaderboardIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const LeaderboardSection = ({ leaderboard, setLeaderboard, saving, onSave }) => (
    <SectionCard
        title="Leaderboard Settings"
        subtitle="Configure public leaderboard visibility and content."
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Leaderboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Show the Top Players leaderboard to all users.
                    </Typography>
                </Box>
                <Switch
                    checked={!!leaderboard.enabled}
                    onChange={(e) =>
                        setLeaderboard((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                />
            </Box>

            <Divider />

            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Show Robots in Leaderboard</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Include robot players in rankings with randomized names.
                    </Typography>
                </Box>
                <Switch
                    checked={!!leaderboard.includeRobots}
                    onChange={(e) =>
                        setLeaderboard((prev) => ({ ...prev, includeRobots: e.target.checked }))
                    }
                />
            </Box>
        </Stack>
    </SectionCard>
);

export default LeaderboardSection;