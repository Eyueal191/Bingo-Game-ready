import React, { useMemo, useCallback } from "react";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";

const PaymentHistoryModal = ({ open, onClose, payments, agentName }) => {
  const columns = useMemo(
    () => [
      {
        field: "transactionDate",
        headerName: "Date",
        minWidth: 180,
        renderCell: (p) =>
          p?.row?.transactionDate
            ? new Date(p.row.transactionDate).toLocaleString()
            : "-",
      },
      {
        field: "amount",
        headerName: "Amount",
        minWidth: 120,
        renderCell: (p) => Number(p?.row?.amount ?? 0).toLocaleString(),
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => p?.row?.notes || "-",
      },
    ],
    []
  );

  const fetchRows = useCallback(
    async ({ page, pageSize, quickFilter, sortModel }) => {
      let data = Array.isArray(payments) ? payments.slice() : [];
      const q = (quickFilter || "").trim().toLowerCase();
      if (q) {
        data = data.filter(
          (pm) =>
            String(pm.notes || "")
              .toLowerCase()
              .includes(q) ||
            String(pm.amount || "")
              .toLowerCase()
              .includes(q)
        );
      }
      if (Array.isArray(sortModel) && sortModel.length > 0) {
        const { field, sort } = sortModel[0];
        if (field && sort) {
          data.sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (field === "transactionDate") {
              const at = new Date(av).getTime();
              const bt = new Date(bv).getTime();
              return sort === "asc" ? at - bt : bt - at;
            }
            if (typeof av === "number" && typeof bv === "number") {
              return sort === "asc" ? av - bv : bv - av;
            }
            return sort === "asc"
              ? String(av ?? "").localeCompare(String(bv ?? ""))
              : String(bv ?? "").localeCompare(String(av ?? ""));
          });
        }
      }
      const rowCount = data.length;
      const start = page * pageSize;
      const end = start + pageSize;
      const rows = data.slice(start, end).map((r) => ({ ...r, id: r._id }));
      return { rows, rowCount };
    },
    [payments]
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", sm: 600 },
          maxWidth: "95vw",
          maxHeight: "85vh",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: { xs: 2, sm: 3 },
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="h6">Payment History for {agentName}</Typography>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 200, overflow: "auto" }}>
          <SmartDataGrid
            columns={columns}
            fetchRows={fetchRows}
            initialPageSize={5}
            pageSizeOptions={[5, 10, 15, 25, 50]}
            dynamicHeight
          />
        </Box>
      </Box>
    </Modal>
  );
};

export default PaymentHistoryModal;
