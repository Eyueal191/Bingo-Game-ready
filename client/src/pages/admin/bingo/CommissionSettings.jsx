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
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";

const CommissionSettings = () => {
  const api = useApi();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all pending stakes like bonus settings do
      const res = await api.get("/api/v1/stake-bonus/admin/pending-stakes");
      // Transform to show commission data
      const commissionData = res.data.map((stake) => ({
        stakeAmount: stake.stakeAmount,
        systemCommission: stake.systemCommission || 0.2,
        hasExistingSetting: !!stake._id,
      }));
      setSettings(commissionData);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to load commission settings",
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
  const handleAdd = () => setEdit({ stakeAmount: "", systemCommission: 0.2 });

  const handleSave = async () => {
    if (!edit) return;

    try {
      const systemCommission =
        edit.systemCommission === null || edit.systemCommission === undefined
          ? 0.2 // default if empty
          : edit.systemCommission; // use existing or new decimal

      await api.post("/api/v1/stake-bonus/commission", {
        stakeAmount: Number(edit.stakeAmount),
        systemCommission,
      });

      setSnackbar({
        open: true,
        message: edit.stakeAmount
          ? "Commission updated successfully"
          : "Commission added successfully",
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Commission Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Manage house profit commissions for all stake amounts
      </Typography>

      <Box mb={2}>
        <Typography variant="body2" color="text.secondary">
          Showing all available stake amounts with their current commission
          rates
        </Typography>
      </Box>

      <Box mb={2}>
        <Button variant="contained" color="primary" onClick={handleAdd}>
          Add New Commission
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Stake Amount</TableCell>
                <TableCell>System Commission (%)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No commission settings found.
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((row) => (
                  <TableRow key={row.stakeAmount}>
                    <TableCell>{row.stakeAmount}</TableCell>
                    <TableCell>
                      {row.systemCommission !== undefined &&
                      row.systemCommission !== null
                        ? (row.systemCommission * 100).toFixed(1) + "%"
                        : "20.0%"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!edit} onClose={handleClose}>
        <DialogTitle>Edit Commission</DialogTitle>
        <DialogContent>
          <TextField
            label="Stake Amount"
            type="number"
            value={edit?.stakeAmount || ""}
            onChange={(e) => {
              if (!edit) return;
              setEdit({ ...edit, stakeAmount: e.target.value });
            }}
            fullWidth
            margin="dense"
            disabled={!!edit?.stakeAmount} // Disable if editing existing
            required
            inputProps={{ min: 0, step: 0.01 }}
          />

          <TextField
            label="System Commission (%)"
            type="number"
            value={
              edit?.systemCommission === null ||
              edit?.systemCommission === undefined
                ? ""
                : (edit.systemCommission * 100).toString()
            }
            onChange={(e) => {
              if (!edit) return;
              const inputValue = e.target.value;
              setEdit({
                ...edit,
                systemCommission:
                  inputValue === "" ? null : parseFloat(inputValue) / 100,
              });
            }}
            fullWidth
            margin="dense"
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            helperText="House profit percentage (e.g., 20.0 for 20%)"
          />
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

export default CommissionSettings;