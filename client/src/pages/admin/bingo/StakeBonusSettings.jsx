import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";

const StakeBonusSettings = () => {
  const api = useApi();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null);
  // Removed addOpen/addForm state: no add logic, only edit
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [validationError, setValidationError] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Use the admin endpoint to get pending stakes with bonus info
      const res = await api.get("/api/v1/stake-bonus/admin/pending-stakes");
      const normalized = res.data.map((row) => ({
        ...row,
        robotWinningPercent: row.robotWinningPercent ?? 0,
      }));
      setSettings(normalized);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to load settings",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleEdit = (row) => setEdit({ ...row });
  const handleClose = () => setEdit(null);

  const handleSave = async () => {
    if (!edit) return; // Prevent null reference error


    const min = Number(edit.robotMinCards);
    const max = Number(edit.robotMaxCards);
    const winPercent = Number(edit.robotWinningPercent);

    if (edit.robotEnabled && (isNaN(min) || isNaN(max) || min > max)) {
      setValidationError("Robot Min Cards must be less than or equal to Max Cards.");
      return;
    }
    if (Number.isNaN(winPercent) || winPercent < 0 || winPercent > 100) {
      setValidationError(
        "Robot Winning Percentage must be between 0 and 100."
      );
      return;
    }

    setValidationError("");
    try {
      await api.post("/api/v1/stake-bonus", {
        stakeAmount: Number(edit.stakeAmount),
        bonusEnabled: edit.bonusEnabled,
        bonusAmount: Number(edit.bonusAmount),
        bonusDescription: edit.bonusDescription,
        robotEnabled: edit.robotEnabled,
        robotMinCards: Number(edit.robotMinCards) || 1,
        robotMaxCards: Number(edit.robotMaxCards) || 5,
        robotWinningPercent: Math.max(0, Math.min(100, winPercent || 0)),

      });
      setSnackbar({
        open: true,
        message: "Settings updated successfully",
        severity: "success",
      });
      setEdit(null);
      fetchSettings();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message,
        severity: "error",
      });
    }
  };

  // Remove add handlers, only allow editing

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Bonus Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Configure bonus settings for active game rooms
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Stake Amount</TableCell>
                <TableCell>Bonus Enabled</TableCell>
                <TableCell>Bonus Amount</TableCell>
                <TableCell>Bonus Description</TableCell>
                <TableCell>Robot Win %</TableCell>

                <TableCell>Robot Enabled</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No pending rooms or stake amounts found.
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((row) => (
                  <TableRow key={row.stakeAmount}>
                    <TableCell>{row.stakeAmount}</TableCell>
                    <TableCell>{row.bonusEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.bonusAmount}</TableCell>
                    <TableCell>{row.bonusDescription || "-"}</TableCell>
                    <TableCell>{`${row.robotWinningPercent ?? 0}%`}
                    </TableCell>
                    <TableCell>{row.robotEnabled ? "Yes" : "No"}</TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleEdit(row)}
                      >
                        {row._id ? "Edit" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add New Dialog removed: only editing allowed */}

      {/* Edit Dialog */}
      <Dialog open={!!edit} onClose={handleClose}>
        <DialogTitle>Edit Bonus Settings</DialogTitle>
        <DialogContent>
          <TextField
            label="Stake Amount"
            value={edit?.stakeAmount || ""}
            fullWidth
            margin="dense"
            disabled
          />

          <Box display="flex" alignItems="center" mt={2} mb={1}>
            <Typography>Enable Bonus</Typography>
            <Switch
              checked={!!edit?.bonusEnabled}
              onChange={(e) =>
                setEdit(
                  edit ? { ...edit, bonusEnabled: e.target.checked } : null
                )
              }
            />
          </Box>

          {edit?.bonusEnabled && (
            <>
              <TextField
                label="Bonus Amount"
                type="number"
                value={edit?.bonusAmount || 0}
                onChange={(e) =>
                  setEdit(
                    edit ? { ...edit, bonusAmount: e.target.value } : null
                  )
                }
                fullWidth
                margin="dense"
              />
              <TextField
                label="Bonus Description"
                value={edit?.bonusDescription || ""}
                onChange={(e) =>
                  setEdit(
                    edit ? { ...edit, bonusDescription: e.target.value } : null
                  )
                }
                fullWidth
                margin="dense"
              />

            </>
          )}
          <Box display="flex" alignItems="center" mt={2}>
            <Typography>Robot Enabled</Typography>
            <Switch
              checked={!!edit?.robotEnabled}
              onChange={(e) =>
                setEdit({ ...edit, robotEnabled: e.target.checked })
              }
            />
          </Box>
          <TextField
            label="Robot Min Cards"
            type="number"
            value={edit?.robotMinCards ?? ""}
            onChange={(e) => setEdit({ ...edit, robotMinCards: e.target.value })}
            fullWidth
            margin="dense"
            inputProps={{ min: 1, max: 500 }}
            helperText="Minimum cards the robot will reserve for this stake."
          />

          <TextField
            label="Robot Max Cards"
            type="number"
            value={edit?.robotMaxCards ?? ""}
            onChange={(e) => setEdit({ ...edit, robotMaxCards: e.target.value })}
            fullWidth
            margin="dense"
            inputProps={{ min: 1, max: 500 }}
            helperText="Maximum cards the robot will reserve for this stake (200-300 recommended)."
          />
          <TextField
            label="Robot Winning Percentage"
            type="number"
            value={edit?.robotWinningPercent ?? ""}
            onChange={(e) => setEdit({ ...edit, robotWinningPercent: e.target.value })}
            fullWidth
            margin="dense"
            inputProps={{ min: 0, max: 100 }}
            disabled={!edit?.robotEnabled}
            helperText="0 disables bias, 100 guarantees the robot will finish first when possible."
          />
          {validationError && (
            <Typography color="error" variant="body2" mt={1}>
              {validationError}
            </Typography>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StakeBonusSettings;