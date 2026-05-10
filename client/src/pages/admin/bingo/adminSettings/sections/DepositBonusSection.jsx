import React from "react";
import { Box, Button, Stack, Switch, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const DepositBonusSection = ({ depositBonus, setDepositBonus, saving, onSave }) => (
  <SectionCard
    title="Deposit Bonus"
    subtitle="Optionally add a percentage bonus on every successful deposit."
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
    <Stack spacing={2}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography>Enable Deposit Bonus</Typography>
        <Switch
          checked={Boolean(depositBonus.enabled)}
          onChange={(e) =>
            setDepositBonus((prev) => ({
              ...prev,
              enabled: e.target.checked,
            }))
          }
        />
      </Box>

      <TextField
        label="Bonus Percent (%)"
        type="number"
        value={depositBonus.percent}
        onChange={(e) =>
          setDepositBonus((prev) => ({
            ...prev,
            percent: e.target.value,
          }))
        }
        fullWidth
        inputProps={{ min: 0, max: 100 }}
        helperText="Example: 20 means deposit + 20% will be credited."
      />
    </Stack>
  </SectionCard>
);

export default DepositBonusSection;
