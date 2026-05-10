import React from "react";
import {
  Button,
  Divider,
  Grid,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import SectionCard from "../SectionCard";

const BotPaymentsSection = ({ botPayments, setBotPayments, saving, onSave }) => {
  const deposit = botPayments?.deposit || {};
  const depositFlows = deposit.flows || {};
  const depositMethods = deposit.methods || {};

  const withdraw = botPayments?.withdraw || {};
  const withdrawFlows = withdraw.flows || {};
  const withdrawChannels = withdraw.channels || {};

  const setDepositFlow = (key, value) =>
    setBotPayments((prev) => ({
      ...(prev || {}),
      deposit: {
        ...(prev?.deposit || {}),
        flows: {
          ...(prev?.deposit?.flows || {}),
          [key]: value,
        },
      },
    }));

  const setDepositMethod = (key, value) =>
    setBotPayments((prev) => ({
      ...(prev || {}),
      deposit: {
        ...(prev?.deposit || {}),
        methods: {
          ...(prev?.deposit?.methods || {}),
          [key]: value,
        },
      },
    }));

  const setWithdrawFlow = (key, value) =>
    setBotPayments((prev) => ({
      ...(prev || {}),
      withdraw: {
        ...(prev?.withdraw || {}),
        flows: {
          ...(prev?.withdraw?.flows || {}),
          [key]: value,
        },
      },
    }));

  const setWithdrawChannel = (key, value) =>
    setBotPayments((prev) => ({
      ...(prev || {}),
      withdraw: {
        ...(prev?.withdraw || {}),
        channels: {
          ...(prev?.withdraw?.channels || {}),
          [key]: value,
        },
      },
    }));

  return (
    <SectionCard
      title="Bot Payments"
      subtitle="Enable/disable deposit and withdrawal flows and channels shown in the Telegram bot."
      footer={
        <Stack direction="row" spacing={2} alignItems="center">
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
        <Typography variant="subtitle1">Deposit Flows</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={depositFlows.manual !== false}
                onChange={(e) => setDepositFlow("manual", e.target.checked)}
              />
              <Typography>Manual</Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={depositFlows.automatic !== false}
                onChange={(e) => setDepositFlow("automatic", e.target.checked)}
              />
              <Typography>Automatic</Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={depositFlows.online === true}
                onChange={(e) => setDepositFlow("online", e.target.checked)}
              />
              <Typography>Online</Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider />

        <Typography variant="subtitle1">Deposit Methods</Typography>
        <Grid container spacing={2}>
          {[
            ["cbe", "CBE"],
            ["telebirr", "TeleBirr"],
            ["abyssinia", "Abyssinia"],
            ["cbebirr", "CBE Birr"],
            ["dashen", "Dashen"],
            ["telebirr_online", "TeleBirr (Online)"],
            ["cbe_online", "CBE Birr (Online)"],
            ["mpesa_online", "M-Pesa (Online)"],
          ].map(([key, label]) => (
            <Grid key={key} item xs={12} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={depositMethods[key] !== false}
                  onChange={(e) => setDepositMethod(key, e.target.checked)}
                />
                <Typography>{label}</Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider />

        <Typography variant="subtitle1">Withdrawal Flows</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={withdrawFlows.manual !== false}
                onChange={(e) => setWithdrawFlow("manual", e.target.checked)}
              />
              <Typography>Manual</Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Switch
                checked={withdrawFlows.automatic === true}
                onChange={(e) => setWithdrawFlow("automatic", e.target.checked)}
              />
              <Typography>Automatic</Typography>
            </Stack>
          </Grid>
        </Grid>

        <Divider />

        <Typography variant="subtitle1">Withdrawal Channels</Typography>
        <Grid container spacing={2}>
          {[
            ["cbe", "CBE"],
            ["telebirr", "TeleBirr"],
            ["abyssinia", "Abyssinia"],
            ["cbebirr", "CBE Birr"],
            ["dashen", "Dashen"],
          ].map(([key, label]) => (
            <Grid key={key} item xs={12} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={withdrawChannels[key] !== false}
                  onChange={(e) => setWithdrawChannel(key, e.target.checked)}
                />
                <Typography>{label}</Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </SectionCard>
  );
};

export default BotPaymentsSection;
