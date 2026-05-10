import React from "react";
import { Button, Grid, Stack, TextField } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";
import { trimAt } from "../utils";

const BotSection = ({ bot, setBot, saving, onSave }) => (
  <SectionCard
    title="Bot & Support"
    subtitle="Telegram bot handles and support contact information."
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
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          label="Bot Display Name"
          value={bot.botName}
          onChange={(e) =>
            setBot((prev) => ({ ...prev, botName: e.target.value }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Bot Username"
          helperText="Provide without @"
          value={bot.botUserName}
          onChange={(e) =>
            setBot((prev) => ({ ...prev, botUserName: trimAt(e.target.value) }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Support Username"
          helperText="Provide without @"
          value={bot.supportUserName}
          onChange={(e) =>
            setBot((prev) => ({
              ...prev,
              supportUserName: trimAt(e.target.value),
            }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Support Channel URL"
          value={bot.supportChannelUrl}
          onChange={(e) =>
            setBot((prev) => ({
              ...prev,
              supportChannelUrl: e.target.value,
            }))
          }
          fullWidth
        />
      </Grid>
    </Grid>
  </SectionCard>
);

export default BotSection;
