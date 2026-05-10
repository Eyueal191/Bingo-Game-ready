import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import { useApi } from "../../../contexts/ApiContext";

const AdminCardsManagement = () => {
  const api = useApi();
  const [overrideExisting, setOverrideExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [dbCount, setDbCount] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runInsert = async (count) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      // Check existing count first
      const current = await api.get(`/api/v1/bingo-cards/count`);
      const existing = current?.data?.count ?? current?.count ?? 0;
      // update UI count
      setDbCount(existing);
      if (existing > 0 && !overrideExisting) {
        setError(`There are already ${existing} cards in the database. Enable Override or delete existing cards first.`);
        setLoading(false);
        return;
      }

      const res = await api.post(`/api/v1/bingo-cards/insert?count=${count}`, { override: overrideExisting });
      const data = res?.data || res;
      setMessage(data.message || `${data.insertedCount || 0} cards inserted`);
      // refresh count after successful insert
      try {
        const after = await api.get(`/api/v1/bingo-cards/count`);
        setDbCount(after?.data?.count ?? after?.count ?? null);
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to insert cards");
    } finally {
      setLoading(false);
    }
  };

  const fetchDbCount = async () => {
    try {
      const res = await api.get(`/api/v1/bingo-cards/count`);
      const c = res?.data?.count ?? res?.count ?? 0;
      setDbCount(c);
      return c;
    } catch (e) {
      console.error('Failed to fetch db count', e);
      return null;
    }
  };

  const deleteExisting = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.delete(`/api/v1/bingo-cards`);
      const data = res?.data || res;
      setMessage(data.message || 'Deleted existing cards');
      // refresh count
      try {
        const after = await api.get(`/api/v1/bingo-cards/count`);
        setDbCount(after?.data?.count ?? after?.count ?? 0);
      } catch (e) {}
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to delete cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetch initial DB count on mount
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await fetchDbCount();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cards Management
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Insert the bundled bingo cards (100, 200, 300, or 400) into the database. Use override to delete existing cards before inserting.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="subtitle2">Current DB count:</Typography>
          <Typography variant="h6">{dbCount === null ? '—' : dbCount}</Typography>
          <IconButton size="small" onClick={fetchDbCount} aria-label="refresh count">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={overrideExisting}
                onChange={(e) => setOverrideExisting(e.target.checked)}
              />
            }
            label="Override (delete existing cards first)"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 2, alignItems: 'center' }}>
          <Button variant="contained" color="primary" onClick={() => runInsert(100)} disabled={loading}>
            Insert 100
          </Button>
          <Button variant="contained" color="secondary" onClick={() => runInsert(200)} disabled={loading}>
            Insert 200
          </Button>
          <Button variant="contained" onClick={() => runInsert(300)} disabled={loading}>
            Insert 300
          </Button>
          <Button variant="contained" onClick={() => runInsert(400)} disabled={loading}>
            Insert 400
          </Button>
          <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)} disabled={loading}>
            Delete existing
          </Button>
          {loading && <CircularProgress size={20} />}
        </Box>

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete all existing bingo cards? This action is irreversible.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button color="error" onClick={deleteExisting}>Delete</Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ mt: 2 }}>
          {message && <Alert severity="success">{message}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminCardsManagement;