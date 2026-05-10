import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Button,
    TextField,
    Typography,
    Switch,
    FormControlLabel,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Checkbox,
    ListItemText,
    Grid,
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from "@mui/icons-material";
import { useApi } from "../../../contexts/ApiContext";
import SmartDataGrid from "../../../components/SmartDataGrid";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { toast } from "sonner";

const AVAILABLE_CHANNELS = ["manual", "automatic"];

const AdminCountries = () => {
    const api = useApi();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [countryToDelete, setCountryToDelete] = useState(null);
    const gridRef = useRef(null);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        dialCode: "",
        currencyCode: "",
        currencySymbol: "",
        exchangeRate: 1,
        isActive: true,
        supportedChannels: ["manual"],
        flag: "",
    });

    const fetchRows = useCallback(async ({ page, pageSize, quickFilter }) => {
        try {
            const res = await api.get("/api/v1/countries");
            let data = res.data || [];

            if (quickFilter) {
                const q = quickFilter.toLowerCase();
                data = data.filter(c => 
                    c.name.toLowerCase().includes(q) || 
                    c.code.toLowerCase().includes(q) || 
                    c.dialCode.includes(q)
                );
            }

            const start = page * pageSize;
            const paginatedData = data.slice(start, start + pageSize);

            return {
                rows: paginatedData,
                rowCount: data.length
            };
        } catch (err) {
            console.error("Failed to fetch countries", err);
            return { rows: [], rowCount: 0 };
        }
    }, [api]);

    const handleRefresh = () => {
        gridRef.current?.refresh();
    };

    const handleOpenDialog = (country = null) => {
        if (country) {
            setEditingCountry(country);
            setFormData({
                name: country.name || "",
                code: country.code || "",
                dialCode: country.dialCode || "",
                currencyCode: country.currencyCode || "",
                currencySymbol: country.currencySymbol || "",
                exchangeRate: country.exchangeRate || 1,
                isActive: country.isActive ?? true,
                supportedChannels: country.supportedChannels || ["manual"],
                flag: country.flag || "",
            });
        } else {
            setEditingCountry(null);
            setFormData({
                name: "",
                code: "",
                dialCode: "",
                currencyCode: "",
                currencySymbol: "",
                exchangeRate: 1,
                isActive: true,
                supportedChannels: ["manual"],
                flag: "",
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCountry(null);
    };

    const handleSaveCountry = async (e) => {
        e.preventDefault();
        const { name, code, dialCode, currencyCode } = formData;
        if (!name || !code || !dialCode || !currencyCode) {
            toast.error("Name, Code, Dial Code, and Currency Code are required.");
            return;
        }

        try {
            if (editingCountry) {
                await api.put(`/api/v1/countries/${editingCountry._id}`, formData);
                toast.success("Country updated successfully");
            } else {
                await api.post("/api/v1/countries", formData);
                toast.success("Country added successfully");
            }
            handleCloseDialog();
            handleRefresh();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save country");
        }
    };

    const handleDeleteClick = (country) => {
        setCountryToDelete(country);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!countryToDelete) return;
        try {
            await api.delete(`/api/v1/countries/${countryToDelete._id}`);
            toast.success("Country deleted successfully");
            handleRefresh();
        } catch (err) {
            toast.error("Failed to delete country");
        } finally {
            setDeleteConfirmOpen(false);
            setCountryToDelete(null);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        let finalValue = value;
        if (name === "supportedChannels") {
            finalValue = typeof value === "string" ? value.split(",") : value;
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : finalValue
        }));
    };

    const columns = [
        { 
            field: "flag", 
            headerName: "Flag", 
            width: 80,
            renderCell: (params) => (
                <Typography variant="h5" sx={{ mt: 0.5 }}>{params.value || "🏳️"}</Typography>
            )
        },
        { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
        { field: "code", headerName: "Code", width: 80 },
        { field: "dialCode", headerName: "Dial", width: 100 },
        { 
            field: "currencyCode", 
            headerName: "Currency", 
            width: 120,
            renderCell: (params) => `${params.row.currencySymbol || ""} ${params.value}`
        },
        { 
            field: "exchangeRate", 
            headerName: "Rate (1 USD)", 
            width: 140,
            renderCell: (params) => `${params.value} ${params.row.currencyCode}`
        },
        {
            field: "supportedChannels",
            headerName: "Channels",
            flex: 1,
            minWidth: 180,
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
            field: "isActive",
            headerName: "Status",
            width: 100,
            renderCell: (params) => (
                <Chip
                    label={params.value ? "Active" : "Inactive"}
                    color={params.value ? "success" : "default"}
                    size="small"
                />
            )
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
                            <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteClick(params.row)}>
                            <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ];

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    Country Management
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Country
                </Button>
            </Box>

            <Box>
                <SmartDataGrid
                    columns={columns}
                    fetchRows={fetchRows}
                    getRowId={(row) => row._id}
                    onReady={(readyApi) => (gridRef.current = readyApi)}
                    initialPageSize={10}
                />
            </Box>

            <Dialog 
                open={dialogOpen} 
                onClose={handleCloseDialog}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editingCountry ? "Edit Country" : "Add Country"}
                </DialogTitle>
                <DialogContent dividers>
                    <form onSubmit={handleSaveCountry} id="country-form">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
                            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                                <TextField
                                    fullWidth
                                    label="Country Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="ISO Code (e.g., ET)"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                    inputProps={{ maxLength: 2 }}
                                />
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                                <TextField
                                    fullWidth
                                    label="Dial Code (e.g., +251)"
                                    name="dialCode"
                                    value={formData.dialCode}
                                    onChange={handleChange}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Currency Code (e.g., ETB)"
                                    name="currencyCode"
                                    value={formData.currencyCode}
                                    onChange={handleChange}
                                    required
                                />
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                                <TextField
                                    fullWidth
                                    label="Currency Symbol"
                                    name="currencySymbol"
                                    value={formData.currencySymbol}
                                    onChange={handleChange}
                                />
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Exchange Rate (1 USD = ?)"
                                    name="exchangeRate"
                                    value={formData.exchangeRate}
                                    onChange={handleChange}
                                />
                            </Box>

                            <FormControl fullWidth>
                                <InputLabel>Supported Channels</InputLabel>
                                <Select
                                    multiple
                                    name="supportedChannels"
                                    value={formData.supportedChannels}
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
                                            <Checkbox checked={formData.supportedChannels.indexOf(ch) > -1} />
                                            <ListItemText primary={ch} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

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
                                    label="Enabled"
                                />
                                <TextField
                                    fullWidth
                                    label="FlagIdentifier (Emoji)"
                                    name="flag"
                                    value={formData.flag}
                                    onChange={handleChange}
                                    sx={{ maxWidth: 200 }}
                                />
                            </Box>
                        </Box>
                    </form>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseDialog} color="inherit" variant="outlined">Cancel</Button>
                    <Button type="submit" form="country-form" variant="contained" color="primary">
                        {editingCountry ? "Update" : "Create"}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirmOpen}
                title="Delete Country"
                message={`Are you sure you want to delete ${countryToDelete?.name}? This might affect users and payment methods associated with this country.`}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
                confirmText="Delete"
                confirmColor="error"
            />
        </Box>
    );
};

export default AdminCountries;
