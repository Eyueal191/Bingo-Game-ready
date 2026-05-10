import React from "react";
import {
  Button,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddCircleOutline,
  DeleteOutline,
  Save as SaveIcon,
} from "@mui/icons-material";
import SectionCard from "../SectionCard";
import { emptyAccount } from "../utils";

const PaymentsSection = ({
  paymentAccounts,
  setPaymentAccounts,
  saving,
  onSave,
  normalizedPaymentPayload,
}) => (
  <SectionCard
    title="Payment Accounts"
    subtitle="Manage the manual deposit accounts exposed to players."
    footer={
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="outlined"
          startIcon={<AddCircleOutline />}
          onClick={() =>
            setPaymentAccounts((prev) => ({
              ...prev,
              manual: [...prev.manual, emptyAccount()],
            }))
          }
        >
          Add Account
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => onSave(normalizedPaymentPayload)}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Stack>
    }
  >
    {paymentAccounts.manual.length === 0 && (
      <Typography sx={{ color: "text.secondary" }}>
        No manual payment accounts configured.
      </Typography>
    )}

    <Stack spacing={2}>
      {paymentAccounts.manual.map((account, index) => (
        <Paper
          key={`${account.provider || "account"}-${index}`}
          variant="outlined"
          sx={{ p: 2 }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Provider Key"
                value={account.provider}
                onChange={(e) =>
                  setPaymentAccounts((prev) => {
                    const manual = [...prev.manual];
                    manual[index] = {
                      ...manual[index],
                      provider: e.target.value,
                    };
                    return { ...prev, manual };
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Label"
                value={account.label}
                onChange={(e) =>
                  setPaymentAccounts((prev) => {
                    const manual = [...prev.manual];
                    manual[index] = {
                      ...manual[index],
                      label: e.target.value,
                    };
                    return { ...prev, manual };
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Account Name"
                value={account.accountName}
                onChange={(e) =>
                  setPaymentAccounts((prev) => {
                    const manual = [...prev.manual];
                    manual[index] = {
                      ...manual[index],
                      accountName: e.target.value,
                    };
                    return { ...prev, manual };
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Account Number"
                value={account.accountNumber}
                onChange={(e) =>
                  setPaymentAccounts((prev) => {
                    const manual = [...prev.manual];
                    manual[index] = {
                      ...manual[index],
                      accountNumber: e.target.value,
                    };
                    return { ...prev, manual };
                  })
                }
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={10}>
              <TextField
                label="Instructions"
                value={account.instructions}
                onChange={(e) =>
                  setPaymentAccounts((prev) => {
                    const manual = [...prev.manual];
                    manual[index] = {
                      ...manual[index],
                      instructions: e.target.value,
                    };
                    return { ...prev, manual };
                  })
                }
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>

            <Grid
              item
              xs={12}
              md={2}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Tooltip title={account.isActive ? "Visible to users" : "Hidden"}>
                <Switch
                  checked={account.isActive}
                  onChange={(e) =>
                    setPaymentAccounts((prev) => {
                      const manual = [...prev.manual];
                      manual[index] = {
                        ...manual[index],
                        isActive: e.target.checked,
                      };
                      return { ...prev, manual };
                    })
                  }
                />
              </Tooltip>

              <Tooltip title="Remove account">
                <IconButton
                  edge="end"
                  onClick={() =>
                    setPaymentAccounts((prev) => ({
                      ...prev,
                      manual: prev.manual.filter((_, idx) => idx !== index),
                    }))
                  }
                >
                  <DeleteOutline />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Stack>

    <Divider sx={{ my: 3 }} />

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          label="General Instructions"
          value={paymentAccounts.instructions}
          onChange={(e) =>
            setPaymentAccounts((prev) => ({
              ...prev,
              instructions: e.target.value,
            }))
          }
          fullWidth
          multiline
          minRows={2}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="Support Note"
          value={paymentAccounts.supportNote}
          onChange={(e) =>
            setPaymentAccounts((prev) => ({
              ...prev,
              supportNote: e.target.value,
            }))
          }
          fullWidth
          multiline
          minRows={2}
        />
      </Grid>
    </Grid>
  </SectionCard>
);

export default PaymentsSection;
