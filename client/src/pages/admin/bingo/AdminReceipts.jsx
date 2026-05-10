import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";
import toast, { Toaster } from "react-hot-toast";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";

const AdminReceipts = ({ onSelectReceipt }) => {
  const [pageRows, setPageRows] = useState([]);
  const [openReceipt, setOpenReceipt] = useState(null);
  const [receiptContent, setReceiptContent] = useState(null);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [receiptError, setReceiptError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const refreshRef = useRef(null);

  const api = useApi();
  const fetchReceipts = useCallback(
    async (args = {}) => {
      const {
        page = 0,
        pageSize = 10,
        quickFilter = "",
        extraFilters = {},
      } = args;
      try {
        const queryParams = new URLSearchParams();
        if (extraFilters?.startDate)
          queryParams.append("startDate", extraFilters.startDate);
        if (extraFilters?.endDate)
          queryParams.append("endDate", extraFilters.endDate);
        // server currently returns full list; we'll do client-side paging
        const res = await api.get(
          `/api/v1/manual-payment/receipts?${queryParams.toString()}`
        );
        let items = res.data.data || [];
        // quick filter across name, phone, and status
        const q = (quickFilter || "").toLowerCase();
        if (q) {
          items = items.filter((r) =>
            [r.userId?.fullName, r.userId?.phone, r.status]
              .filter(Boolean)
              .some((x) => String(x).toLowerCase().includes(q))
          );
        }
        const rowCount = items.length;
        const start = page * pageSize;
        const rows = items.slice(start, start + pageSize);
        setPageRows(rows);
        setFilteredTotal(rowCount);
        return { rows, rowCount };
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch receipts");
        return { rows: [], rowCount: 0 };
      }
    },
    [api]
  );

  // search now handled by SmartDataGrid quick filter

  const fetchReceiptFile = useCallback(
    async (fileUrl) => {
      try {
        setReceiptError(null);
        setReceiptContent(null);
        const response = await api.get(`/${fileUrl}`, {
          responseType: "blob",
        });
        const blob = new Blob([response.data], {
          type: response.headers["content-type"],
        });
        const url = URL.createObjectURL(blob);
        setReceiptContent(url);
      } catch (error) {
        console.error("Error fetching receipt file:", error);
        setReceiptError("Receipt not available");
      }
    },
    [api]
  );

  const handleViewReceipt = useCallback(
    (receipt) => {
      setOpenReceipt(receipt);
      fetchReceiptFile(receipt.fileUrl);
    },
    [fetchReceiptFile]
  );

  const handleProcess = useCallback(
    (receipt) => {
      onSelectReceipt({
        ...receipt,
        onSuccess: () => {
          // use the grid's refresh to reload with current paging/filters
          refreshRef.current?.();
        },
      });
    },
    [onSelectReceipt]
  );

  // pagination handled by SmartDataGrid

  const validateDates = (startDate, endDate) => {
    // console.log("Validating dates:", { startDate, endDate });
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // console.log("Parsed dates:", { start, end });
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast.error("Invalid date format");
        // console.log("Invalid date format detected");
        return false;
      }
      if (start > end) {
        // console.log("Toast should fire: Start Date > End Date");
        toast.error("Start Date cannot be greater than End Date");
        // console.log("Validation failed: Start date > End date");
        return false;
      }
    }
    // console.log("Validation passed");
    return true;
  };

  // filters applied via SmartDataGrid renderFilters

  const getReceiptContent = () => {
    if (receiptContent) {
      if (openReceipt.fileUrl.endsWith(".pdf")) {
        return (
          <iframe
            src={receiptContent}
            style={{ width: "100%", height: "500px", border: "none" }}
            title="Receipt PDF"
          />
        );
      } else {
        return (
          <img
            src={receiptContent}
            alt="Receipt"
            style={{
              maxWidth: "100%",
              maxHeight: "500px",
              objectFit: "contain",
            }}
          />
        );
      }
    } else if (receiptError) {
      return <Typography color="error">{receiptError}</Typography>;
    } else {
      return <Typography>Loading...</Typography>;
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 3,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <Toaster />
      <Typography
        variant="h5"
        sx={{
          color: "text.primary",
          mb: 2,
          fontWeight: "bold",
          background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: { xs: "1.25rem", sm: "1.5rem" }, // Responsive font size
        }}
      >
        Payment Receipts
      </Typography>

      <SmartDataGrid
        columns={useMemo(
          () => [
            {
              field: "index",
              headerName: "#",
              width: 70,
              sortable: false,
              renderCell: (p) => {
                const api = p?.api;
                const pos = api?.getRowIndexRelativeToVisibleRows?.(p?.id);
                return typeof pos === "number" ? pos + 1 : "";
              },
            },
            {
              field: "fullName",
              headerName: "User",
              minWidth: 150,
              flex: 1,
              renderCell: (p) => p?.row?.userId?.fullName || "N/A",
            },
            {
              field: "phone",
              headerName: "Phone",
              minWidth: 140,
              renderCell: (p) => p?.row?.userId?.phone || "N/A",
            },
            {
              field: "wallet",
              headerName: "Wallet",
              minWidth: 140,
              renderCell: (p) => `${p?.row?.userId?.wallet ?? "N/A"} Birr`,
            },
            {
              field: "receipt",
              headerName: "Receipt",
              minWidth: 120,
              sortable: false,
              renderCell: (p) => (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleViewReceipt(p.row)}
                >
                  View
                </Button>
              ),
            },
            {
              field: "status",
              headerName: "Status",
              minWidth: 120,
              renderCell: (p) => p?.row?.status || "N/A",
            },
            {
              field: "action",
              headerName: "Action",
              minWidth: 140,
              sortable: false,
              renderCell: (p) => (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handleProcess(p.row)}
                  disabled={p?.row?.status !== "pending"}
                  sx={{ minWidth: 80 }}
                >
                  Process
                </Button>
              ),
            },
          ],
          [handleViewReceipt, handleProcess]
        )}
        fetchRows={fetchReceipts}
        getRowId={(r) => r._id}
        initialPageSize={5}
        pageSizeOptions={[5, 10, 15, 25, 50, 100]}
        dynamicHeight
        initialExtraFilters={{
          startDate: filters.startDate,
          endDate: filters.endDate,
        }}
        onReady={useCallback(({ refresh }) => {
          refreshRef.current = refresh;
        }, [])}
        renderFilters={({ filters: extra, setFilters: setExtra, refresh }) => (
          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={extra?.startDate || ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, startDate: e.target.value }));
                setExtra((f) => ({ ...f, startDate: e.target.value }));
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: { xs: "100%", sm: 150 },
                bgcolor: "background.default",
              }}
            />
            <TextField
              name="endDate"
              label="End Date"
              type="date"
              value={extra?.endDate || ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, endDate: e.target.value }));
                setExtra((f) => ({ ...f, endDate: e.target.value }));
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: { xs: "100%", sm: 150 },
                bgcolor: "background.default",
              }}
            />
            <Button
              variant="contained"
              onClick={() => {
                if (validateDates(extra?.startDate, extra?.endDate)) {
                  refresh();
                }
              }}
              sx={{ minWidth: { xs: "100%", sm: 120 } }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setFilters({ startDate: "", endDate: "" });
                setExtra({ startDate: "", endDate: "" });
              }}
              sx={{ minWidth: { xs: "100%", sm: 120 } }}
            >
              Clear
            </Button>
          </Box>
        )}
        footerSummary={
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
              fontSize: 13,
              color: "text.secondary",
            }}
          >
            <Box>Filtered: {filteredTotal.toLocaleString()} receipts</Box>
            <Box>Page count: {pageRows.length.toLocaleString()}</Box>
          </Box>
        }
      />

      {/* Receipt Viewer Dialog */}
      {openReceipt && (
        <Dialog
          open={!!openReceipt}
          onClose={() => {
            setOpenReceipt(null);
            setReceiptContent(null);
            setReceiptError(null);
          }}
          maxWidth="md"
          fullWidth
          sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              fontWeight: "bold",
            }}
          >
            Receipt for {openReceipt.userId?.fullName || "N/A"}
          </DialogTitle>
          <DialogContent
            sx={{
              p: { xs: 1, sm: 2 },
              display: "flex",
              justifyContent: "center",
              bgcolor: "background.default",
            }}
          >
            {getReceiptContent()}
          </DialogContent>
          <DialogActions
            sx={{ p: { xs: 1, sm: 2 }, bgcolor: "background.paper" }}
          >
            <Button
              onClick={() => {
                setOpenReceipt(null);
                setReceiptContent(null);
                setReceiptError(null);
              }}
              sx={{ color: "error.main" }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default AdminReceipts;
