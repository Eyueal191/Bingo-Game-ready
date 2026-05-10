import React from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import SectionWrapper from "../../../../components/common/SectionWrapper";

const THEME_PRESETS = {
  "dynamic-orange": {
    headerBg: "#ffd500",
    headerText: "#111",
    bgStart: "",
    bgEnd: "",
    ctaColor: "#f59e0b",
  },
  "royal-purple": {
    headerBg: "#6d28d9",
    headerText: "#fff",
    bgStart: "#1b0033",
    bgEnd: "#3b0764",
    ctaColor: "#a78bfa",
  },
  emerald: {
    headerBg: "#10b981",
    headerText: "#062",
    bgStart: "#022c22",
    bgEnd: "#064e3b",
    ctaColor: "#34d399",
  },
  steel: {
    headerBg: "#94a3b8",
    headerText: "#0f172a",
    bgStart: "#0f172a",
    bgEnd: "#1e293b",
    ctaColor: "#22d3ee",
  },
};

const fieldBox = (minWidth = 220) => ({
  width: { xs: "100%", sm: "auto" },
  minWidth: { sm: minWidth },
  flexGrow: { xs: 1, sm: 0 },
});

const PromoBannerSettings = ({
  banner,
  saving,
  onChange,
  onSave,
  onPreview,
  onUpload,
  onBumpVersion,
}) => {
  if (!banner) return null;

  const patchBanner = (patch) => {
    onChange({
      ...banner,
      ...patch,
    });
  };

  const patchAction = (patch) => {
    patchBanner({
      action: {
        ...(banner.action || {}),
        ...patch,
      },
    });
  };

  const patchTheme = (patch) => {
    patchBanner({
      theme: {
        ...(banner.theme || {}),
        ...patch,
      },
    });
  };

  const handlePresetChange = (value) => {
    const preset = THEME_PRESETS[value] || THEME_PRESETS["dynamic-orange"];
    patchTheme({ ...preset, preset: value });
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const url = await onUpload?.(file);
      if (url) {
        patchBanner({ imageUrl: url });
      }
    } finally {
      event.target.value = "";
    }
  };

  return (
    <SectionWrapper
      title="Promotional Banner"
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ mr: 1 }}>
            v{Number(banner?.version || 1)}
          </Typography>
          <Button
            size="small"
            disabled={saving}
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onBumpVersion}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }} 
          >
            Bump Version
          </Button>
          <Button
            size="small"
            disabled={saving}
            variant="outlined"
            onClick={onPreview}
          >
            Preview
          </Button>
          <Button
            size="small"
            disabled={saving}
            variant="contained"
            onClick={onSave}
          >
            Save
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 2 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography>Enabled</Typography>
            <Switch
              checked={!!banner.enabled}
              onChange={(e) => patchBanner({ enabled: e.target.checked })}
            />
          </Stack>

          <Box sx={fieldBox()}>
            <TextField
              label="Title"
              size="small"
              fullWidth
              value={banner.title || ""}
              onChange={(e) => patchBanner({ title: e.target.value })}
            />
          </Box>

          <Box sx={fieldBox(260)}>
            <TextField
              label="Image URL (optional)"
              size="small"
              fullWidth
              value={banner.imageUrl || ""}
              onChange={(e) => patchBanner({ imageUrl: e.target.value })}
              helperText="Paste a direct URL or upload below"
            />
          </Box>

          <Button
            variant="outlined"
            component="label"
            size="small"
            sx={fieldBox(180)}
          >
            Upload Image
            <input type="file" accept="image/*" hidden onChange={handleUpload} />
          </Button>

          <Box sx={fieldBox()}>
            <TextField
              label="Action Label"
              size="small"
              fullWidth
              value={banner.action?.label || ""}
              onChange={(e) => patchAction({ label: e.target.value })}
            />
          </Box>

          <Box sx={fieldBox(260)}>
            <TextField
              label="Action URL"
              size="small"
              fullWidth
              value={banner.action?.url || ""}
              onChange={(e) => patchAction({ url: e.target.value })}
            />
          </Box>

          <Box sx={fieldBox(220)}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Expires At"
                value={banner.expiresAt ? dayjs(banner.expiresAt) : null}
                onChange={(newValue) =>
                  patchBanner({
                    expiresAt: newValue ? newValue.toDate().toISOString() : "",
                  })
                }
                ampm={false}
                minutesStep={5}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>

          <Box sx={fieldBox(200)}>
            <TextField
              select
              label="Theme Preset"
              size="small"
              fullWidth
              value={banner.theme?.preset || "dynamic-orange"}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              <MenuItem value="dynamic-orange">Dynamic Orange (default)</MenuItem>
              <MenuItem value="royal-purple">Royal Purple</MenuItem>
              <MenuItem value="emerald">Emerald</MenuItem>
              <MenuItem value="steel">Steel</MenuItem>
            </TextField>
          </Box>
        </Stack>

        <Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={3}>
    <TextField
      type="color"
      label="Header BG"
      size="small"
      value={banner.theme?.headerBg || "#ffd500"}
      onChange={(e) => patchTheme({ headerBg: e.target.value })}
      sx={{ width: 120 }}
      InputLabelProps={{ shrink: true }}
    />
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <TextField
      type="color"
      label="Header Text"
      size="small"
      value={banner.theme?.headerText || "#111111"}
      onChange={(e) => patchTheme({ headerText: e.target.value })}
      sx={{ width: 120 }}
      InputLabelProps={{ shrink: true }}
    />
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <TextField
      type="color"
      label="BG Start (optional)"
      size="small"
      value={banner.theme?.bgStart || "#000000"}
      onChange={(e) => patchTheme({ bgStart: e.target.value })}
      sx={{ width: 170 }}
      helperText="Leave empty for default"
      InputLabelProps={{ shrink: true }}
    />
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <TextField
      type="color"
      label="BG End (optional)"
      size="small"
      value={banner.theme?.bgEnd || "#000000"}
      onChange={(e) => patchTheme({ bgEnd: e.target.value })}
      sx={{ width: 170 }}
      helperText="Leave empty for default"
      InputLabelProps={{ shrink: true }}
    />
  </Grid>

  <Grid item xs={12} sm={6} md={3}>
    <TextField
      type="color"
      label="CTA Color"
      size="small"
      value={banner.theme?.ctaColor || "#f59e0b"}
      onChange={(e) => patchTheme({ ctaColor: e.target.value })}
      sx={{ width: 140 }}
      InputLabelProps={{ shrink: true }}
    />
  </Grid>
</Grid>



        <TextField
          label="Body"
          multiline
          minRows={3}
          fullWidth
          value={banner.body || ""}
          onChange={(e) => patchBanner({ body: e.target.value })}
        />

        <Typography variant="caption" color="text.secondary">
          Use Preview to verify the banner before publishing. Changes are only
          live after you hit Save.
        </Typography>
      </Stack>
    </SectionWrapper>
  );
};

export default PromoBannerSettings;
