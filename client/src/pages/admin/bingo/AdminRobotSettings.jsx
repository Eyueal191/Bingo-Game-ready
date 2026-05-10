import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Switch,
  Stack,
  Snackbar,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Refresh, Save as SaveIcon, Settings as SettingsIcon, SmartToy as RobotIcon, Speed as SpeedIcon } from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import SectionWrapper from "../../../components/common/SectionWrapper";
import { Divider, Grid, MenuItem, Slider } from "@mui/material";

const AdminRobotSettings = () => {
  const api = useApi();

  const [settings, setSettings] = useState({
    cardAmount: 10,
    maxUserReservedCards: 5,
    maxTotalCards: 20,
    countdownDuration: 30,
    defaultPlayMode: 'manual',
    winPattern: 'two_line',
    cardReservation: {
      mode: 'single',
      maxCardsPerUser: 1,
      maxCardsPerRoom: 5,
      allowCrossRoomReservations: false,
      isClickToReserve: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Config State (Robot Toggle)
  const [cfgLoading, setCfgLoading] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [cfgError, setCfgError] = useState(null);
  const [snack, setSnack] = useState(null);

  // Bot Pacing Settings State - SIMPLIFIED: Only 3 settings
  const [pacing, setPacing] = useState({
    maxCardsPerTick: 50,
    delayMs: 100,
    verboseLogging: false,
  });
  const [pacingLoading, setPacingLoading] = useState(true);
  const [savingPacing, setSavingPacing] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get(
          `/api/v1/settings`,
        );

        if (res.data?.success) {
          const data = res.data.data;
          setSettings({
            cardAmount: data.cardAmount,
            maxUserReservedCards: data.maxUserReservedCards,
            maxTotalCards: data.maxTotalCards,
            countdownDuration: data.countdownDuration ?? 30,
            defaultPlayMode: data.defaultPlayMode ?? 'manual',
            winPattern: data.winPattern ?? 'two_line',
            cardReservation: data.cardReservation || {
              mode: 'single',
              maxCardsPerUser: 1,
              maxCardsPerRoom: 5,
              allowCrossRoomReservations: false,
              isClickToReserve: false
            }
          });
        }
        setLoading(false);
      } catch (error) {
        setSnack({
          severity: "error",
          msg: error.response?.data?.message || "Failed to fetch settings"
        });
        setLoading(false);
      }
    };

    fetchSettings();
  }, [api]);

  // Fetch Config (Robot Toggle)
  const loadCfg = useCallback(async () => {
    try {
      setCfgLoading(true);
      const { data } = await api.get(`/api/v1/config`);
      data.robotEnabledGlobal = data.robotEnabledGlobal ?? true;
      setCfg(data);
      setCfgError(null);
    } catch (e) {
      setCfgError(e.response?.data?.error || e.message || "Failed to load config");
    } finally {
      setCfgLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadCfg();
  }, [loadCfg]);

  // Fetch Bot Pacing Settings - SIMPLIFIED
  const loadPacing = useCallback(async () => {
    try {
      setPacingLoading(true);
      const { data } = await api.get(`/api/v1/bot-pacing`);
      if (data.success && data.data) {
        setPacing({
          maxCardsPerTick: data.data.maxCardsPerTick ?? 50,
          delayMs: data.data.delayMs ?? 100,
          verboseLogging: data.data.verboseLogging ?? false,
        });
      }
    } catch (e) {
      // Silent fail - use defaults
      console.error("Failed to load pacing settings", e);
    } finally {
      setPacingLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadPacing();
  }, [loadPacing]);

  // Save Bot Pacing Settings
  const savePacingSettings = async () => {
    try {
      setSavingPacing(true);
      await api.put(`/api/v1/bot-pacing`, pacing);
      setSnack({ severity: "success", msg: "Bot pacing settings saved successfully!" });
    } catch (e) {
      setSnack({
        severity: "error",
        msg: e.response?.data?.message || e.message || "Failed to save pacing settings",
      });
    } finally {
      setSavingPacing(false);
    }
  };


  // Validate inputs
  const validate = () => {
    const newErrors = {};
    if (!settings.cardAmount || Number(settings.cardAmount) < 1) {
      newErrors.cardAmount = "Must be an integer ≥ 1";
    }
    if (
      !settings.maxUserReservedCards ||
      Number(settings.maxUserReservedCards) < 1
    ) {
      newErrors.maxUserReservedCards = "Must be an integer ≥ 1";
    }
    if (!settings.maxTotalCards || Number(settings.maxTotalCards) < 2) {
      newErrors.maxTotalCards = "Must be an integer ≥ 2";
    }
    if (!settings.countdownDuration || Number(settings.countdownDuration) < 10 || Number(settings.countdownDuration) > 300) {
      newErrors.countdownDuration = "Must be 10-300 seconds";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleUpdate = async () => {
    if (!validate()) {
      setSnack({ severity: "error", msg: "Please fix the errors in the form" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(
        `/api/v1/settings`,
        {
          cardAmount: Number(settings.cardAmount),
          maxUserReservedCards: Number(settings.maxUserReservedCards),
          maxTotalCards: Number(settings.maxTotalCards),
          countdownDuration: Number(settings.countdownDuration),
          defaultPlayMode: settings.defaultPlayMode,
          winPattern: settings.winPattern,
          cardReservation: settings.cardReservation
        }
      );

      setSnack({ severity: "success", msg: res.data.message || "Settings updated successfully" });
      setErrors({});
    } catch (error) {
      setSnack({
        severity: "error",
        msg: error.response?.data?.message || "Failed to update settings"
      });
    } finally {
      setSubmitting(true);
      setTimeout(() => setSubmitting(false), 500);
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value
      }
    }));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };
  // Update Robot Toggle Config
  const updateRobotConfig = async () => {
    if (!cfg) return;
    try {
      setSavingCfg(true);
      await api.put(`/api/v1/config`, {
        robotEnabledGlobal: cfg.robotEnabledGlobal,
      });
      setSnack({ severity: "success", msg: `Robot automation setting saved.` });
      await loadCfg(); // Refresh config
    } catch (e) {
      setSnack({
        severity: "error",
        msg: e.response?.data?.error || e.message || "Failed to save config",
      });
    } finally {
      setSavingCfg(false);
    }
  };

  if (loading || cfgLoading || pacingLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <SettingsIcon fontSize="large" color="primary" />
        Game System & Automation
      </Typography>

      <Stack spacing={4}>
        {/* --- Core Game Engine Settings --- */}
        <SectionWrapper
          title="Bingo Engine Settings"
          subtitle="Configure system-wide limits and bot behavior."
          actions={
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleUpdate}
              disabled={submitting}
              sx={{ borderRadius: 2 }}
            >
              {submitting ? "Saving..." : "Save Settings"}
            </Button>
          }
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="System Reservation Target (Bots)"
                name="cardAmount"
                type="number"
                value={settings.cardAmount}
                onChange={handleChange}
                fullWidth
                error={!!errors.cardAmount}
                helperText={errors.cardAmount || "Number of cards bots strive to fill."}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Max Total Cards Per Room"
                name="maxTotalCards"
                type="number"
                value={settings.maxTotalCards}
                onChange={handleChange}
                fullWidth
                error={!!errors.maxTotalCards}
                helperText={errors.maxTotalCards || "Limit for bots + users combined."}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Countdown Duration (seconds)"
                name="countdownDuration"
                type="number"
                value={settings.countdownDuration}
                onChange={handleChange}
                fullWidth
                error={!!errors.countdownDuration}
                helperText={errors.countdownDuration || "Time before game starts (10-300 sec)."}
                inputProps={{ min: 10, max: 300 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Default Game Playmode"
                name="defaultPlayMode"
                value={settings.defaultPlayMode || 'manual'}
                onChange={handleChange}
                fullWidth
                helperText="Initial playmode for all users."
              >
                <MenuItem value="manual">Manual Mode</MenuItem>
                <MenuItem value="auto">Auto Mode</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Win Pattern"
                name="winPattern"
                value={settings.winPattern || 'two_line'}
                onChange={handleChange}
                fullWidth
                helperText="How many lines needed to win."
              >
                <MenuItem value="one_line">One Line</MenuItem>
                <MenuItem value="two_line">Two Lines</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
                RESERVATION EXPERIENCE
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Reservation Mode"
                fullWidth
                value={settings.cardReservation?.mode || "single"}
                onChange={(e) => handleNestedChange("cardReservation", "mode", e.target.value)}
              >
                <MenuItem value="single">Single Card Selection</MenuItem>
                <MenuItem value="multiple">Multi-Card Selection</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Allow Cross-Room Play</Typography>
                  <Typography variant="caption" color="text.secondary">Reserve cards in multiple rooms</Typography>
                </Box>
                <Switch
                  checked={!!settings.cardReservation?.allowCrossRoomReservations}
                  onChange={(e) => handleNestedChange("cardReservation", "allowCrossRoomReservations", e.target.checked)}
                />
              </Box>
            </Grid>
            {settings.cardReservation?.mode === 'multiple' && (
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Click to Reserve (Multi-Card)</Typography>
                    <Typography variant="caption" color="text.secondary">Immediate reservation on click</Typography>
                  </Box>
                  <Switch
                    checked={!!settings.cardReservation?.isClickToReserve}
                    onChange={(e) => handleNestedChange("cardReservation", "isClickToReserve", e.target.checked)}
                  />
                </Box>
              </Grid>
            )}

            {settings.cardReservation?.mode === 'multiple' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Cards Per User (Global)"
                    type="number"
                    fullWidth
                    value={settings.cardReservation?.maxCardsPerUser}
                    onChange={(e) => handleNestedChange("cardReservation", "maxCardsPerUser", Number(e.target.value))}
                    helperText="Total cards a user can have active across all rooms."
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Max Cards Per Room (User)"
                    type="number"
                    fullWidth
                    value={settings.cardReservation?.maxCardsPerRoom}
                    onChange={(e) => handleNestedChange("cardReservation", "maxCardsPerRoom", Number(e.target.value))}
                    helperText="Max cards one user can take in a single room."
                  />
                </Grid>
              </>
            )}
          </Grid>
        </SectionWrapper>

        {/* --- Global Automation Master Switch --- */}
        <SectionWrapper
          title="Automation & Bots"
          subtitle="Master toggle for robot participation."
          actions={
            <Button
              variant="outlined"
              size="small"
              disabled={savingCfg}
              onClick={updateRobotConfig}
              startIcon={<RobotIcon />}
              sx={{ borderRadius: 2 }}
            >
              {savingCfg ? "Saving..." : "Save Automation"}
            </Button>
          }
        >
          {cfgError ? (
            <Alert severity="error">
              {cfgError}
              <Button onClick={loadCfg} size="small" sx={{ ml: 2 }} startIcon={<Refresh />}>Retry</Button>
            </Alert>
          ) : (
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ p: 1 }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>Global Robot Status</Typography>
                  <Typography variant="caption" color="text.secondary">Master switch for all bot activity</Typography>
                </Box>
                <Switch
                  checked={!!cfg.robotEnabledGlobal}
                  onChange={(e) => setCfg({ ...cfg, robotEnabledGlobal: e.target.checked })}
                />
              </Box>
            </Stack>
          )}
        </SectionWrapper>

        {/* --- Bot Pacing Settings - SIMPLIFIED --- */}
        <SectionWrapper
          title="Bot Pacing Configuration"
          subtitle="Simple controls for how fast robots reserve cards."
          actions={
            <Button
              variant="outlined"
              size="small"
              disabled={savingPacing}
              onClick={savePacingSettings}
              startIcon={<SpeedIcon />}
              sx={{ borderRadius: 2 }}
            >
              {savingPacing ? "Saving..." : "Save Pacing"}
            </Button>
          }
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Cards Per Batch: {pacing.maxCardsPerTick}
              </Typography>
              <Slider
                value={pacing.maxCardsPerTick}
                onChange={(e, val) => setPacing(prev => ({ ...prev, maxCardsPerTick: val }))}
                min={1}
                max={100}
                step={1}
                marks={[{ value: 1, label: '1' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
              />
              <Typography variant="caption" color="text.secondary">
                How many cards the robot reserves per batch. Higher = faster but more visible.
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Delay Between Batches: {pacing.delayMs}ms
              </Typography>
              <Slider
                value={pacing.delayMs}
                onChange={(e, val) => setPacing(prev => ({ ...prev, delayMs: val }))}
                min={20}
                max={1000}
                step={10}
                marks={[{ value: 20, label: '20ms' }, { value: 500, label: '500ms' }, { value: 1000, label: '1s' }]}
              />
              <Typography variant="caption" color="text.secondary">
                Wait time between reservation batches. Lower = faster reservation speed.
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Debug Logging</Typography>
                  <Typography variant="caption" color="text.secondary">Log detailed pacing info to server console</Typography>
                </Box>
                <Switch
                  checked={!!pacing.verboseLogging}
                  onChange={(e) => setPacing(prev => ({ ...prev, verboseLogging: e.target.checked }))}
                />
              </Box>
            </Grid>

            {/* Info Box explaining simplified pacing */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>How it works:</strong> The robot reserves <strong>{pacing.maxCardsPerTick} cards</strong> every <strong>{pacing.delayMs}ms</strong> until it reaches its target (configured per-stake in Stake Settings).
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </SectionWrapper>
      </Stack>

      {/* Snackbar Notification */}
      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {snack && (
          <Alert severity={snack.severity} sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}>
            {snack.msg}
          </Alert>
        )}
      </Snackbar>
    </Box>
  );
};

export default AdminRobotSettings;