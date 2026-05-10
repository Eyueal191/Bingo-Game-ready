import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import { useApi } from "../../../contexts/ApiContext";
import { motion } from "framer-motion";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { format } from "date-fns";

const AdminBonuses = () => {
  // no explicit loading spinner; SmartDataGrid shows loading internally when fetching
  const [error, setError] = useState(null);
  const api = useApi();
  const [pageRows, setPageRows] = useState([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const cacheRef = useRef({ key: "", all: [] });

  const toNumber = useCallback((v) => {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const fetchRows = useCallback(
    async ({ page, pageSize, quickFilter, extraFilters }) => {
      try {
        const key = JSON.stringify({ quickFilter, extraFilters });
        if (cacheRef.current.key !== key) {
          const response = await api.get(`/api/v1/transactions/bonuses`);
          const all = (response.data?.transactions || []).map((t) => ({
            id: t.id || t.transactionId || t._id,
            ...t,
          }));
          cacheRef.current = { key, all };
        }
        // Client-side filter by quickFilter and bonusType
        let items = cacheRef.current.all;
        const q = (quickFilter || "").toLowerCase();
        if (q) {
          items = items.filter((r) =>
            [
              r.fullName,
              r.phone,
              r.referralCode,
              r.bonusType,
              r.status,
              r.description,
              r.source,
              r.amount,
              r.bonusAmount,
              r.bonusPercent,
              r.creditedAmount,
            ]
              .filter(Boolean)
              .some((x) => String(x).toLowerCase().includes(q))
          );
        }
        if (extraFilters?.bonusType && extraFilters.bonusType !== "all") {
          items = items.filter((r) => r.bonusType === extraFilters.bonusType);
        }
        if (extraFilters?.source && extraFilters.source !== "all") {
          items = items.filter((r) => r.source === extraFilters.source);
        }
        const rowCount = items.length;
        const start = page * pageSize;
        const rows = items.slice(start, start + pageSize);
        setPageRows(rows);
        setFilteredTotal(rowCount);
        setError(null);
        return { rows, rowCount };
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch bonus transactions"
        );
        return { rows: [], rowCount: 0 };
      }
    },
    [api]
  );

  const columns = useMemo(
    () => [
      {
        field: "fullName",
        headerName: "Full Name",
        minWidth: 150,
        flex: 1,
        renderCell: (p) => p?.row?.fullName || "Unknown",
      },
      {
        field: "phone",
        headerName: "Phone",
        minWidth: 130,
        renderCell: (p) => p?.row?.phone || "—",
      },
      {
        field: "referralCode",
        headerName: "Referral Code",
        minWidth: 140,
        renderCell: (p) => p?.row?.referralCode || "—",
      },
      {
        field: "bonusType",
        headerName: "Bonus Type",
        minWidth: 160,
        renderCell: (p) =>
          (p?.row?.bonusType || "").replace("_", " ").toUpperCase(),
      },
      {
        field: "source",
        headerName: "Source",
        minWidth: 110,
        renderCell: (p) => p?.row?.source || "—",
      },
      {
        field: "amount",
        headerName: "Amount (ETB)",
        minWidth: 120,
        renderCell: (p) => toNumber(p?.row?.amount).toLocaleString(),
      },
      {
        field: "creditedAmount",
        headerName: "Credited Amount",
        minWidth: 120,
        renderCell: (p) => toNumber(p?.row?.creditedAmount).toLocaleString(),
      },
      {
        field: "bonusAmount",
        headerName: "Bonus Amount",
        minWidth: 120,
        renderCell: (p) => toNumber(p?.row?.bonusAmount).toLocaleString(),
      },
      {
        field: "bonusPercent",
        headerName: "Bonus %",
        minWidth: 100,
        renderCell: (p) => p?.row?.bonusPercent ? `${p.row.bonusPercent}%` : "—",
      },
      {
        field: "description",
        headerName: "Description",
        minWidth: 200,
        flex: 1,
        renderCell: (p) => p?.row?.description || "—",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 110,
        renderCell: (p) => p?.row?.status || "—",
      },
      {
        field: "createdAt",
        headerName: "Created At",
        minWidth: 160,
        renderCell: (p) => {
          try {
            const v = p?.row?.createdAt;
            return v ? format(new Date(v), "yyyy-MM-dd HH:mm") : "—";
          } catch {
            return "—";
          }
        },
      },
    ],
    [toNumber]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Box
        sx={{
          p: { xs: 1, sm: 2, md: 3 },
          bgcolor: "background.paper",
          borderRadius: 4,
          boxShadow: 3,
          minHeight: "fit-content",
          width: "100%",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 2.5,
            fontWeight: 700,
            color: "text.primary",
            background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          Bonus Transactions
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <SmartDataGrid
          columns={columns}
          fetchRows={fetchRows}
          getRowId={(r) => r.id}
          initialPageSize={10}
          pageSizeOptions={[5, 10, 15, 25, 50, 100]}
          dynamicHeight
          onReady={() => {}}
          renderFilters={({ filters, setFilters, refresh }) => (
            <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
              <Select
                value={filters?.bonusType || "all"}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, bonusType: e.target.value }))
                }
                displayEmpty
                sx={{
                  minWidth: { xs: "100%", sm: 180 },
                  bgcolor: "background.default",
                }}
              >
                <MenuItem value="all">All Bonus Types</MenuItem>
                <MenuItem value="registration_bonus">Registration Bonus</MenuItem>
                <MenuItem value="referral_bonus">Referral Bonus</MenuItem>
                <MenuItem value="deposit">Deposit Bonus</MenuItem>
              </Select>
              <Select
                value={filters?.source || "all"}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, source: e.target.value }))
                }
                displayEmpty
                sx={{
                  minWidth: { xs: "100%", sm: 140 },
                  bgcolor: "background.default",
                }}
              >
                <MenuItem value="all">All Sources</MenuItem>
                <MenuItem value="wallet">Wallet</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </Select>
              <Button
                variant="contained"
                onClick={refresh}
                sx={{ minWidth: { xs: "100%", sm: 120 } }}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                onClick={() => setFilters({ bonusType: "all", source: "all" })}
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
              <Box>Filtered: {filteredTotal.toLocaleString()} transactions</Box>
              <Box>
                Page total:{" "}
                {pageRows
                  .reduce((s, r) => s + toNumber(r.amount), 0)
                  .toLocaleString()}{" "}
                ETB
              </Box>
            </Box>
          }
        />
      </Box>
    </motion.div>
  );
};

export default AdminBonuses;
