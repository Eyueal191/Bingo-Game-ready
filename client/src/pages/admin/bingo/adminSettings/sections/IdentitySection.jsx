import React from "react";
import { Button, Grid, Stack, TextField } from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const IdentitySection = ({ identity, setIdentity, saving, onSave }) => (
  <SectionCard
    title="Identity"
    subtitle="Control the public-facing names shown across the platform."
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
          label="App Name"
          value={identity.appName}
          onChange={(e) =>
            setIdentity((prev) => ({ ...prev, appName: e.target.value }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Localized App Name"
          value={identity.appNameLocalized}
          onChange={(e) =>
            setIdentity((prev) => ({
              ...prev,
              appNameLocalized: e.target.value,
            }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Short Name"
          value={identity.shortName}
          onChange={(e) =>
            setIdentity((prev) => ({ ...prev, shortName: e.target.value }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          label="Tagline"
          value={identity.tagline}
          onChange={(e) =>
            setIdentity((prev) => ({ ...prev, tagline: e.target.value }))
          }
          fullWidth
        />
      </Grid>
    </Grid>
  </SectionCard>
);

export default IdentitySection;
