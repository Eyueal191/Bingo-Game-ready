import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { motion } from "framer-motion";
import { useApi } from "../../../contexts/ApiContext";
import { toast } from "sonner";

const KeshPayoutsSection = ({ payouts, setPayouts, setError }) => {
  const api = useApi();
  const theme = useTheme();
  const isXS = useMediaQuery(theme.breakpoints.down("sm"));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at_desc");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Filter payouts
  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch = (payout.user_id?.fullName || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort filtered payouts
  const sortedPayouts = [...filteredPayouts].sort((a, b) => {
    if (sortBy === "created_at_asc") {
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "created_at_desc") {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "amount_asc") {
      return a.amount - b.amount;
    } else if (sortBy === "amount_desc") {
      return b.amount - a.amount;
    }
    return 0;
  });

  // Calculate pagination details
  const totalItems = sortedPayouts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayouts = sortedPayouts.slice(startIndex, endIndex);

  // Reset currentPage when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, itemsPerPage, sortBy]);

  const formatCurrency = (value) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "N/A" : num.toFixed(2);
  };

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return theme.palette.primary.main;
      case "paid":
        return theme.palette.success.main;
      default:
        return "#fff";
    }
  };

  const handleUpdatePayout = async (payoutId, status) => {
    try {
      await api.put(`/api/v1/keshkesh/payouts/${payoutId}`, { status });
      setPayouts(
        payouts.map((p) => (p._id === payoutId ? { ...p, status } : p))
      );
      setSnackbar({
        open: true,
        message: "Payout updated successfully",
        severity: "success",
      });
      toast.success("Payout updated successfully");
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Failed to update payout";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortBy("created_at_desc");
    setItemsPerPage(5);
    setCurrentPage(1);
  };

  // Table styles with 3D effect on rows
  const tableSx = {
    minWidth: { xs: 0, sm: 600 },
    fontSize: { xs: "0.65rem", sm: "0.9rem" },
    borderCollapse: "separate",
    borderSpacing: { xs: "0 6px", sm: "0 8px" },
    "& th, & td": {
      padding: { xs: "4px 2px", sm: "8px 4px" },
      lineHeight: 1.1,
      border: "none",
    },
    "& th": {
      fontWeight: 700,
      fontSize: { xs: "0.65rem", sm: "0.95rem" },
      padding: { xs: "5px 2px", sm: "10px 4px" },
      background: "linear-gradient(145deg, #5a667a, #3e4857)",
      color: "#fff",
      textAlign: "center",
      whiteSpace: "nowrap",
      boxShadow:
        "2px 2px 4px rgba(0, 0, 0, 0.3), -2px -2px 4px rgba(255, 255, 255, 0.1)",
      borderRadius: "4px",
    },
    "& td": {
      color: "#fff",
      background: "transparent",
      textAlign: "center",
      fontSize: { xs: "0.65rem", sm: "0.9rem" },
    },
    "& tr": {
      background: "linear-gradient(145deg, #3a4557, #252f3e)",
      boxShadow:
        "1px 1px 3px rgba(0, 0, 0, 0.2), -1px -1px 3px rgba(255, 255, 255, 0.05)",
      borderRadius: "4px",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      },
    },
    "& tr:nth-of-type(even)": {
      background: "linear-gradient(145deg, #2e3746, #1c2532)",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      sx={{ p: 2 }}
    >
      <Typography variant="h4" gutterBottom>
        Kesh-Kesh Payout Management
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          label="Search by User Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            minWidth: 200,
            backgroundColor: "rgba(255,255,255,0.5)",
            "& .MuiInputBase-input": { color: "inherit" },
            "& .MuiInputLabel-root": { color: "inherit" },
          }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: "inherit" }}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            sx={{
              backgroundColor: "rgba(255,255,255,0.5)",
              color: "inherit",
              "& .MuiSvgIcon-root": { color: "inherit" },
            }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: "inherit" }}>Sort By</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Sort By"
            sx={{
              backgroundColor: "rgba(255,255,255,0.5)",
              color: "inherit",
              "& .MuiSvgIcon-root": { color: "inherit" },
            }}
          >
            <MenuItem value="created_at_desc">Date (Newest First)</MenuItem>
            <MenuItem value="created_at_asc">Date (Oldest First)</MenuItem>
            <MenuItem value="amount_desc">Amount (High to Low)</MenuItem>
            <MenuItem value="amount_asc">Amount (Low to High)</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: "inherit" }}>Items per Page</InputLabel>
          <Select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            label="Items per Page"
            sx={{
              backgroundColor: "rgba(255,255,255,0.5)",
              color: "inherit",
              "& .MuiSvgIcon-root": { color: "inherit" },
            }}
          >
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" color="primary" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: "#2d3748",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "100vw",
          overflowX: "auto",
          perspective: "1000px",
        }}
      >
        <Table sx={tableSx} aria-label="payouts table">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Amount (ETB)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPayouts.length > 0 ? (
              currentPayouts.map((payout) => (
                <TableRow key={payout._id}>
                  <TableCell>{payout._id.slice(0, 8)}</TableCell>
                  <TableCell>{payout.user_id?.fullName || "Unknown"}</TableCell>
                  <TableCell>{formatCurrency(payout.amount)}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        color: getStatusColor(payout.status),
                        fontWeight: 600,
                        fontSize: isXS ? "0.6rem" : "0.75rem",
                      }}
                    >
                      {payout.status.charAt(0).toUpperCase() +
                        payout.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color={
                        payout.status === "pending" ? "success" : "warning"
                      }
                      onClick={() =>
                        handleUpdatePayout(
                          payout._id,
                          payout.status === "pending" ? "paid" : "pending"
                        )
                      }
                      sx={{
                        minWidth: 0,
                        px: { xs: 0.5, sm: 2 },
                        py: { xs: 0.3, sm: 1 },
                        fontSize: { xs: "0.6rem", sm: "0.85rem" },
                        height: { xs: 20, sm: 36 },
                        borderRadius: "16px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                        "&:hover": {
                          transform: "translateY(-1px)",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
                        },
                      }}
                    >
                      {payout.status === "pending"
                        ? "Mark Paid"
                        : "Mark Pending"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  sx={{ textAlign: "center", background: "transparent" }}
                >
                  No payouts match the current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {totalItems > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 2,
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Typography>
            Page {currentPage} of {totalPages || 1}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </Box>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </motion.div>
  );
};

export default KeshPayoutsSection;
