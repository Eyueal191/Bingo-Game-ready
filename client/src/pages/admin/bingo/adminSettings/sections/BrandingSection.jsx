import React from "react";
import {
  Avatar,
  Button,
  Grid,
  Stack,
  TextField,
} from "@mui/material";
import { Save as SaveIcon, Upload as UploadIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const BrandingSection = ({
  branding,
  setBranding,
  brandingFileInputs,
  uploadingBrandingField,
  onUpload,
  saving,
  onSave,
}) => (
  <SectionCard
    title="Branding"
    subtitle="Logos and colors used across the client experience."
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
          label="Primary Logo URL"
          value={branding.logoUrl}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))
          }
          fullWidth
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => brandingFileInputs.logo.current?.click()}
            disabled={uploadingBrandingField === "logo"}
          >
            {uploadingBrandingField === "logo" ? "Uploading..." : "Upload"}
          </Button>
          {branding.logoUrl && (
            <Avatar
              src={branding.logoUrl}
              variant="rounded"
              alt="Logo preview"
              sx={{ width: 48, height: 48 }}
            />
          )}
        </Stack>
        <input
          type="file"
          accept="image/*"
          hidden
          ref={brandingFileInputs.logo}
          onChange={(event) => onUpload("logo", event.target.files)}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          label="Square Logo URL"
          value={branding.squareLogoUrl}
          onChange={(e) =>
            setBranding((prev) => ({
              ...prev,
              squareLogoUrl: e.target.value,
            }))
          }
          fullWidth
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => brandingFileInputs.squareLogo.current?.click()}
            disabled={uploadingBrandingField === "squareLogo"}
          >
            {uploadingBrandingField === "squareLogo"
              ? "Uploading..."
              : "Upload"}
          </Button>
          {branding.squareLogoUrl && (
            <Avatar
              src={branding.squareLogoUrl}
              variant="rounded"
              alt="Square logo preview"
              sx={{ width: 48, height: 48 }}
            />
          )}
        </Stack>
        <input
          type="file"
          accept="image/*"
          hidden
          ref={brandingFileInputs.squareLogo}
          onChange={(event) => onUpload("squareLogo", event.target.files)}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          label="Favicon URL"
          value={branding.faviconUrl}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, faviconUrl: e.target.value }))
          }
          fullWidth
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => brandingFileInputs.favicon.current?.click()}
            disabled={uploadingBrandingField === "favicon"}
          >
            {uploadingBrandingField === "favicon" ? "Uploading..." : "Upload"}
          </Button>
          {branding.faviconUrl && (
            <Avatar
              src={branding.faviconUrl}
              variant="square"
              alt="Favicon preview"
              sx={{ width: 32, height: 32 }}
            />
          )}
        </Stack>
        <input
          type="file"
          accept="image/*"
          hidden
          ref={brandingFileInputs.favicon}
          onChange={(event) => onUpload("favicon", event.target.files)}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <TextField
          label="Primary Color"
          value={branding.primaryColor}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <TextField
          label="Secondary Color"
          value={branding.secondaryColor}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, secondaryColor: e.target.value }))
          }
          fullWidth
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Asset Base URL"
          helperText="Optional. Used to resolve uploaded branding assets when relative paths are provided."
          value={branding.assetBaseUrl}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, assetBaseUrl: e.target.value }))
          }
          fullWidth
        />
      </Grid>
    </Grid>
  </SectionCard>
);

export default BrandingSection;
