import React from "react";
import { Button, Grid, Stack, TextField } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";
import { humanizeKey } from "../utils";

const WalletSection = ({ walletRules, setWalletRules, saving, onSave }) => (
  <SectionCard
    title="Wallet Rules"
    subtitle="Minimum values and requirements for deposits, withdrawals, and transfers."
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
      {Object.entries(walletRules).map(([key, value]) => (
        <Grid item xs={12} md={4} key={key}>
          <TextField
            label={humanizeKey(key)}
            type="number"
            value={value}
            onChange={(e) =>
              setWalletRules((prev) => ({
                ...prev,
                [key]: e.target.value,
              }))
            }
            fullWidth
            inputProps={{ min: 0 }}
          />
        </Grid>
      ))}
    </Grid>
  </SectionCard>
);

export default WalletSection;
