import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
} from "@mui/material";
import SmartDataGrid from "../../../components/SmartDataGrid";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";

const AVAILABLE_CHANNELS = ["manual", "automatic"];//"online" reserved for future

const AdminPaymentMethods = () => {
  const api = useApi();
  
  const [countries, setCountries] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState(null);
  const gridReadyRef = useRef(null);

  const [formData, setFormData] = useState({
    _id: "",
    countryCodes: ["*"],
    provider: "",
    depositChannels: ["manual"],
    withdrawalChannels: ["manual"],
    accountName: "",
    accountNumber: "",
    instructions: "",
    sortOrder: 0,
    isActive: true,
  });

  const fetchCountries = async () => {
    try {
      const { data } = await api.get("/api/v1/countries");
      setCountries(data || []);
    } catch {
      toast.error("Failed to load countries");
    }
  };

  useEffect(() => {
    fetchCountries();
  }, [api]);

  const fetchRows = useCallback(async ({ page, pageSize, quickFilter }) => {
    try {
      const { data } = await api.get("/api/v1/payment-methods/all");
      if (data.success) {
        let allMethods = data.methods || [];
        
        // Client-side quick filter logic
        if (quickFilter) {
          const q = quickFilter.toLowerCase();
          allMethods = allMethods.filter(
            m => 
              (m.provider && m.provider.toLowerCase().includes(q)) ||
              (m.countryCodes && m.countryCodes.some(c => c.toLowerCase().includes(q)))
          );
        }

        const start = page * pageSize;
        const pageData = allMethods.slice(start, start + pageSize);
        return { rows: pageData, rowCount: allMethods.length };
      }
      return { rows: [], rowCount: 0 };
    } catch (err) {
      toast.error("Failed to fetch payment methods");
      return { rows: [], rowCount: 0 };
    }
  }, [api]);

  const refreshGrid = () => {
    if (gridReadyRef.current) gridReadyRef.current.refresh();
  };

  const handleOpenModal = (method = null) => {
    if (method) {
      // Normalize countryCodes from legacy or array sources
      let initialCountries = ["*"];
      if (Array.isArray(method.countryCodes)) {
        initialCountries = method.countryCodes;
      } else if (method.countryCodes) {
        initialCountries = [method.countryCodes];
      } else if (method.countryCode) {
        initialCountries = [method.countryCode];
      }

      setFormData({
        _id: method._id,
        countryCodes: initialCountries,
        provider: method.provider || "",
        depositChannels: method.depositChannels || [],
        withdrawalChannels: method.withdrawalChannels || [],
        accountName: method.accountName || "",
        accountNumber: method.accountNumber || "",
        instructions: method.instructions || "",
        sortOrder: method.sortOrder || 0,
        isActive: method.isActive ?? true,
      });
      setEditMode(true);
    } else {
      setFormData({
        _id: "",
        countryCodes: ["*"],
        provider: "",
        depositChannels: ["manual"],
        withdrawalChannels: ["manual"],
        accountName: "",
        accountNumber: "",
        instructions: "",
        sortOrder: 0,
        isActive: true,
      });
      setEditMode(false);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    // MUI Multi-select passes an array, but autofill passes a comma string
    let finalValue = value;
    if (name === "depositChannels" || name === "withdrawalChannels" || name === "countryCodes") {
      finalValue = typeof value === "string" ? value.split(",") : value;
    }

    // Logical constraint for countryCodes: "*" (All) is mutually exclusive with specific codes
    if (name === "countryCodes" && Array.isArray(finalValue)) {
      const prevValue = formData.countryCodes;
      const hadAll = prevValue.includes("*");
      const hasAllNow = finalValue.includes("*");

      if (!hadAll && hasAllNow) {
        // Just selected "All", clear everything else
        finalValue = ["*"];
      } else if (hadAll && hasAllNow && finalValue.length > 1) {
        // "All" was there, but user just clicked a specific country, remove "All"
        finalValue = finalValue.filter(v => v !== "*");
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : finalValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.provider || !formData.countryCodes || formData.countryCodes.length === 0) {
      toast.error("Provider and Country Codes are required");
      return;
    }

    try {
      const payload = { ...formData };
      delete payload._id;

      if (editMode) {
        await api.put(`/api/v1/payment-methods/${formData._id}`, payload);
        toast.success("Payment method updated");
      } else {
        await api.post("/api/v1/payment-methods", payload);
        toast.success("Payment method created");
      }
      handleCloseModal();
      refreshGrid();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    }
  };

  const handleDeleteClick = (id) => {
    setMethodToDelete(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!methodToDelete) return;
    try {
      await api.delete(`/api/v1/payment-methods/${methodToDelete}`);
      toast.success("Payment method deleted");
      refreshGrid();
    } catch (error) {
      toast.error("Failed to delete method");
    } finally {
      setConfirmOpen(false);
      setMethodToDelete(null);
    }
  };

  const columns = [
    { field: "provider", headerName: "Provider", flex: 1, minWidth: 150 },
    { 
      field: "countryCodes", 
      headerName: "Countries", 
      width: 130,
      renderCell: (p) => (
        <Box sx={{ 
          display: "flex", 
          gap: 0.5, 
          overflowX: "auto", 
          alignItems: "center", 
          height: "100%",
          "&::-webkit-scrollbar": { display: "none" } 
        }}>
          {(p.value || []).map((ch) => (
            <Chip key={ch} label={ch === "*" ? "GLOBAL" : ch} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
          ))}
        </Box>
      ),
    },
    {
      field: "depositChannels",
      headerName: "Deposit",
      flex: 1,
      minWidth: 150,
      renderCell: (p) => (
        <Box sx={{ 
          display: "flex", 
          gap: 0.5, 
          overflowX: "auto", 
          alignItems: "center", 
          height: "100%",
          "&::-webkit-scrollbar": { display: "none" } 
        }}>
          {(p.value || []).map((ch) => (
            <Chip key={ch} label={ch} size="small" variant="outlined" color="primary" sx={{ flexShrink: 0 }} />
          ))}
        </Box>
      ),
    },
    {
      field: "withdrawalChannels",
      headerName: "Withdrawal",
      flex: 1,
      minWidth: 150,
      renderCell: (p) => (
        <Box sx={{ 
          display: "flex", 
          gap: 0.5, 
          overflowX: "auto", 
          alignItems: "center", 
          height: "100%",
          "&::-webkit-scrollbar": { display: "none" } 
        }}>
          {(p.value || []).map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" color="secondary" sx={{ flexShrink: 0 }} />
          ))}
        </Box>
      ),
    },
    { field: "accountNumber", headerName: "Account #", flex: 1, minWidth: 150 },
    {
      field: "isActive",
      headerName: "Status",
      width: 100,
      renderCell: (p) => (
        <Chip
          label={p.value ? "Active" : "Inactive"}
          color={p.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => handleOpenModal(p.row)}>
              <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => handleDeleteClick(p.row._id)}>
              <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Payment Methods
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
        >
          Add Method
        </Button>
      </Box>

      <Box>
        <SmartDataGrid
          columns={columns}
          fetchRows={fetchRows}
          getRowId={(row) => row._id}
          onReady={(api) => (gridReadyRef.current = api)}
          initialPageSize={10}
        />
      </Box>

      <Dialog 
        open={modalOpen} 
        onClose={handleCloseModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editMode ? "Edit Payment Method" : "Add Payment Method"}
        </DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit} id="payment-method-form">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                <FormControl fullWidth required>
                  <InputLabel>Country Codes</InputLabel>
                  <Select
                    multiple
                    name="countryCodes"
                    value={formData.countryCodes}
                    onChange={handleChange}
                    label="Country Codes"
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === "*" ? "All Countries (*)" : value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="*">
                      <Checkbox checked={formData.countryCodes.indexOf("*") > -1} />
                      <ListItemText primary="All Countries (*)" />
                    </MenuItem>
                    {countries.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        <Checkbox checked={formData.countryCodes.indexOf(c.code) > -1} />
                        <ListItemText primary={`${c.name} (${c.code})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Provider Name (e.g. Telebirr, CBE)"
                  name="provider"
                  value={formData.provider}
                  onChange={handleChange}
                  required
                />
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                <FormControl fullWidth>
                  <InputLabel>Deposit Channels</InputLabel>
                  <Select
                    multiple
                    name="depositChannels"
                    value={formData.depositChannels}
                    onChange={handleChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {AVAILABLE_CHANNELS.map((ch) => (
                      <MenuItem key={ch} value={ch}>
                        <Checkbox checked={formData.depositChannels.indexOf(ch) > -1} />
                        <ListItemText primary={ch} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Withdrawal Channels</InputLabel>
                  <Select
                    multiple
                    name="withdrawalChannels"
                    value={formData.withdrawalChannels}
                    onChange={handleChange}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {AVAILABLE_CHANNELS.map((ch) => (
                      <MenuItem key={ch} value={ch}>
                        <Checkbox checked={formData.withdrawalChannels.indexOf(ch) > -1} />
                        <ListItemText primary={ch} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                <TextField
                  fullWidth
                  label="Account Name"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  helperText="For manual deposits"
                />

                <TextField
                  fullWidth
                  label="Account Number"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                />
              </Box>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                helperText="Shown to users during deposit/withdrawal flows"
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleChange}
                      name="isActive"
                      color="success"
                    />
                  }
                  label="Is Active"
                />
                <TextField
                  type="number"
                  label="Sort Order"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  sx={{ width: 120 }}
                />
              </Box>
            </Box>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button type="submit" form="payment-method-form" variant="contained" color="primary">
            {editMode ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Payment Method"
        message="Are you sure you want to delete this payment method? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setMethodToDelete(null);
        }}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default AdminPaymentMethods;
