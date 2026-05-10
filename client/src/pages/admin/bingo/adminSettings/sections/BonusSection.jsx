import React from "react";
import { Box, Button, Stack, Switch, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const BonusSection = ({ bonusSettings, setBonusSettings, saving, onSave }) => (
  <SectionCard
    title="Registration & Referral Bonuses"
    subtitle="Configure optional bonuses applied during onboarding and referrals."
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography>Enable Registration Bonus</Typography>
        <Switch
          checked={bonusSettings.isBonusEnabled}
          onChange={(e) =>
            setBonusSettings((prev) => ({
              ...prev,
              isBonusEnabled: e.target.checked,
            }))
          }
        />
      </Box>
      <TextField
        label="Registration Bonus (ETB)"
        type="number"
        value={bonusSettings.bonusAmount}
        onChange={(e) =>
          setBonusSettings((prev) => ({
            ...prev,
            bonusAmount: e.target.value,
          }))
        }
        fullWidth
        inputProps={{ min: 0 }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography>Enable Referral Bonus</Typography>
        <Switch
          checked={Boolean(bonusSettings.isReferralBonusEnabled)}
          onChange={(e) =>
            setBonusSettings((prev) => ({
              ...prev,
              isReferralBonusEnabled: e.target.checked,
            }))
          }
        />
      </Box>
      <TextField
        label="Referral Bonus (%)"
        type="number"
        value={bonusSettings.referralBonus}
        onChange={(e) =>
          setBonusSettings((prev) => ({
            ...prev,
            referralBonus: e.target.value,
          }))
        }
        fullWidth
        inputProps={{ min: 0, max: 100 }}
      />
    </Stack>
  </SectionCard>
);

export default BonusSection;
