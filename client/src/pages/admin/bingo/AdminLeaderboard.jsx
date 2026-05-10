import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import { useApi } from "../../../contexts/ApiContext";



const formatCurrency = (value, withSign = false) => {
  const amount = Number(value || 0);
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (withSign) {
    if (amount > 0) return `+${formatted} Birr`;
    if (amount < 0) return `-${formatted} Birr`;
  }
  return `${formatted} Birr`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const instance = new Date(value);
  if (Number.isNaN(instance.getTime())) return "-";
  return instance.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
};

const SummaryCard = ({ title, value, helper, accent }) => (
  <Paper
    elevation={3}
    sx={{
      p: 2,
      borderRadius: 2,
      flex: 1,
      minWidth: 220,
      borderLeft: `4px solid ${accent || "#1d4ed8"}`,
    }}
  >
    <Typography variant="overline" color="text.secondary">
      {title}
    </Typography>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
    {helper && (
      <Typography variant="body2" color="text.secondary">
        {helper}
      </Typography>
    )}
  </Paper>
);

const AdminLeaderboard = () => {
  const api = useApi();
  const todayRange = useMemo(buildTodayRange, []);
  const defaultFilters = useMemo(
    () => ({
      stakeAmount: "all",
      includeBots: false,
      startDate: todayRange.startDate,
      endDate: todayRange.endDate,
      search: "",
    }),
    [todayRange]
  );

  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [stakeOptions, setStakeOptions] = useState(["all"]);

  const columns = useMemo(
    () => [
      {
        field: "rank",
        headerName: "Rank",
        type: "number",
        width: 80,
      },
      {
        field: "fullName",
        headerName: "Player",
        flex: 1.1,
        minWidth: 220,
        renderCell: (params) => {
          const row = params?.row || {};
          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {row.fullName || "Player"}
              </Typography>
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                {row.maskedPhone && (
                  <Typography variant="caption" color="text.secondary">
                    {row.maskedPhone}
                  </Typography>
                )}
                {row.isSystemBot && (
                  <Chip
                    label="Bot"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          );
        },
        sortComparator: (value1, value2) =>
          String(value1 || "").localeCompare(String(value2 || "")),
      },
      {
        field: "points",
        headerName: "Points",
        type: "number",
        width: 110,
        valueGetter: (params) => Number(params?.row?.gamesPlayed || 0) * 2,
        renderCell: (params) => {
          const value = Number(params?.row?.gamesPlayed || 0) * 2;
          return (
            <Typography sx={{ fontWeight: 600 }}>
              {value.toLocaleString("en-US")}
            </Typography>
          );
        },
      },
      {
        field: "phone",
        headerName: "Phone",
        width: 170,
        renderCell: (params) => {
          const value = params?.row?.phone;
          return (
            <Typography variant="body2" color={value ? "text.primary" : "text.secondary"}>
              {value || "-"}
            </Typography>
          );
        },
      },
      {
        field: "telegramId",
        headerName: "Telegram",
        width: 170,
        renderCell: (params) => {
          const value = params?.row?.telegramId;
          return (
            <Typography variant="body2" color={value ? "text.primary" : "text.secondary"}>
              {value || "-"}
            </Typography>
          );
        },
      },
      {
        field: "gamesPlayed",
        headerName: "Games",
        type: "number",
        width: 110,
        renderCell: (params) => (
          <Typography>
            {(params?.row?.gamesPlayed ?? 0).toLocaleString("en-US")}
          </Typography>
        ),
      },
      {
        field: "winCount",
        headerName: "Wins",
        type: "number",
        width: 110,
        renderCell: (params) => (
          <Typography>
            {(params?.row?.winCount ?? 0).toLocaleString("en-US")}
          </Typography>
        ),
      },
      {
        field: "totalStake",
        headerName: "Stake (Birr)",
        type: "number",
        width: 140,
        renderCell: (params) => (
          <Typography sx={{ fontWeight: 600 }}>
            {formatCurrency(params?.row?.totalStake)}
          </Typography>
        ),
      },
      {
        field: "totalPrize",
        headerName: "Prize (Birr)",
        type: "number",
        width: 140,
        renderCell: (params) => (
          <Typography sx={{ fontWeight: 600 }}>
            {formatCurrency(params?.row?.totalPrize)}
          </Typography>
        ),
      },
      {
        field: "amountLost",
        headerName: "Amount Lost (Birr)",
        type: "number",
        width: 170,
        renderCell: ({ value }) => {
          const loss = Number(value || 0);
          return (
            <Typography
              sx={{
                fontWeight: 600,
                color: loss > 0 ? "#b91c1c" : "#0f172a",
              }}
            >
              {formatCurrency(loss)}
            </Typography>
          );
        },
        sortComparator: (a, b) => Number(a || 0) - Number(b || 0),
      },
      {
        field: "netEarnings",
        headerName: "Net (Birr)",
        type: "number",
        width: 140,
        renderCell: ({ value }) => {
          const net = Number(value || 0);
          return (
            <Typography
              sx={{
                fontWeight: 600,
                color:
                  net > 0 ? "#047857" : net < 0 ? "#b91c1c" : "#0f172a",
              }}
            >
              {formatCurrency(net, true)}
            </Typography>
          );
        },
        sortComparator: (a, b) => Number(a || 0) - Number(b || 0),
      },
      {
        field: "biggestWin",
        headerName: "Biggest Win",
        type: "number",
        width: 140,
        renderCell: (params) => (
          <Typography sx={{ fontWeight: 600 }}>
            {formatCurrency(params?.row?.biggestWin)}
          </Typography>
        ),
      },
      {
        field: "averagePrize",
        headerName: "Avg Prize",
        type: "number",
        width: 130,
        renderCell: (params) => (
          <Typography sx={{ fontWeight: 600 }}>
            {formatCurrency(params?.row?.averagePrize)}
          </Typography>
        ),
      },
      {
        field: "lastWinAt",
        headerName: "Last Win",
        minWidth: 190,
        valueGetter: (params) => params?.row?.lastWinAt || null,
        renderCell: (params) => (
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(params?.row?.lastWinAt)}
          </Typography>
        ),
      },
      {
        field: "stakeBreakdown",
        headerName: "Stake Breakdown",
        flex: 1,
        minWidth: 240,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const breakdown = Array.isArray(params?.value) ? params.value : [];
          if (!breakdown.length) {
            return (
              <Typography variant="caption" color="text.secondary">
                No data
              </Typography>
            );
          }
          return (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ flexWrap: "wrap" }}
            >
              {breakdown.map((item) => (
                <Chip
                  key={`${params?.row?.userId || "player"}-${item.stakeAmount}-${item.gamesPlayed}`}
                  size="small"
                  label={`${item.stakeAmount} birr · wins: ${item.wins} / cards: ${item.cardsReserved ?? item.gamesPlayed}`}
                  color={item.wins > 0 ? "success" : "default"}
                />
              ))}
            </Stack>
          );
        },
      },
    ],
    []
  );

  const fetchRows = useCallback(
    async ({ page, pageSize, sortModel, quickFilter, extraFilters }) => {
      try {
        const [activeSort] = Array.isArray(sortModel) ? sortModel : [];
        const params = {
          page: page + 1,
          pageSize,
          includeBots: extraFilters.includeBots ? "true" : "false",
        };
        if (extraFilters.stakeAmount && extraFilters.stakeAmount !== "all") {
          params.stakeAmount = extraFilters.stakeAmount;
        }
        if (extraFilters.startDate) {
          params.startDate = extraFilters.startDate;
        }
        if (extraFilters.endDate) {
          params.endDate = extraFilters.endDate;
        }
        if (activeSort?.field) {
          params.sortBy = activeSort.field;
          params.sortOrder = activeSort.sort || "desc";
        }
        const trimmedSearch = (extraFilters.search || "").trim();
        if (quickFilter && trimmedSearch) {
          params.search = `${quickFilter} ${trimmedSearch}`;
        } else if (trimmedSearch) {
          params.search = trimmedSearch;
        } else if (quickFilter) {
          params.search = quickFilter;
        }

        const response = await api.get(
          "/api/v1/games-history/leaderboard/admin",
          { params }
        );
        const data = response.data || {};
        setSummary(data.summary || null);
        setMeta(data.meta || null);
        const summaryStakeOptions = Array.isArray(data.summary?.stakeSummary)
          ? data.summary.stakeSummary
            .map((entry) => entry.stakeAmount)
            .filter((value) => typeof value === "number")
          : [];
        const combinedStakeOptions = [
          ...(Array.isArray(data.stakeOptions) ? data.stakeOptions : []),
          ...summaryStakeOptions,
        ];
        const uniqueSortedStakeOptions = Array.from(
          new Set(
            combinedStakeOptions
              .filter((value) => typeof value === "number" && !Number.isNaN(value))
              .map((value) => Number(value))
          )
        ).sort((a, b) => a - b);
        setStakeOptions(["all", ...uniqueSortedStakeOptions]);

        const rows = Array.isArray(data.leaderboard)
          ? data.leaderboard.map((player) => ({
            ...player,
            points: Number(player.gamesPlayed || 0) * 2,
          }))
          : [];

        return {
          rows,
          rowCount:
            data.total ??
            data.meta?.pagination?.totalRecords ??
            rows.length,
        };
      } catch (error) {
        console.error("Failed to load admin leaderboard:", error);
        setSummary(null);
        setMeta(null);
        return { rows: [], rowCount: 0 };
      }
    },
    [api]
  );

  const renderFilters = useCallback(
    ({ filters, setFilters, refresh }) => {
      const handleUpdate = (key, value) => {
        setFilters((prev) => ({
          ...prev,
          [key]: value,
        }));
      };

      return (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          sx={{ p: 1, alignItems: "center" }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="admin-leaderboard-stake">Stake</InputLabel>
            <Select
              labelId="admin-leaderboard-stake"
              label="Stake"
              value={filters.stakeAmount ?? "all"}
              onChange={(event) => handleUpdate("stakeAmount", event.target.value)}
            >
              {stakeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === "all" ? "All Stakes" : `${option} Birr`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={filters.startDate || ""}
            onChange={(event) => handleUpdate("startDate", event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={filters.endDate || ""}
            onChange={(event) => handleUpdate("endDate", event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Search name / phone"
            placeholder="Type and press Enter"
            size="small"
            value={filters.search || ""}
            onChange={(event) => handleUpdate("search", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                refresh();
              }
            }}
            sx={{ minWidth: 220 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(filters.includeBots)}
                onChange={(event) =>
                  handleUpdate("includeBots", event.target.checked)
                }
                color="primary"
              />
            }
            label="Include system bots"
          />
          <Stack direction="row" spacing={1} sx={{ ml: { md: "auto" } }}>
            <Button variant="contained" size="small" onClick={refresh}>
              Apply
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setFilters({ ...defaultFilters });
                refresh();
              }}
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      );
    },
    [defaultFilters, stakeOptions]
  );

  const footerSummary = useMemo(() => {
    if (!summary) return null;
    return (
      <>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Total players: {summary.totalPlayers?.toLocaleString?.() || 0}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Total stake: {formatCurrency(summary.totalStake)}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Net outcome: {formatCurrency(summary.netEarnings, true)}
        </Typography>
      </>
    );
  }, [summary]);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        background: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: "1300px",
          mx: "auto",
          p: { xs: 2.5, md: 4 },
          borderRadius: 3,
          background: "rgba(255, 255, 255, 0.95)",
          pb: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "#1d4ed8", mb: 0.5 }}
            >
              Bingo Leaderboard (Admin)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Investigate player performance with live filters, server-side sorting, and instant search.
            </Typography>
            {meta?.period?.label && (
              <Chip
                label={meta.period.label}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {summary && (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ flexWrap: "wrap" }}
            >
              <SummaryCard
                title="Prize Paid"
                value={formatCurrency(summary.totalPrize)}
                helper={`Across ${summary.totalPlayers?.toLocaleString?.() || 0} winners`}
                accent="#1d4ed8"
              />
              <SummaryCard
                title="Total Wagered"
                value={formatCurrency(summary.totalStake)}
                helper={`Net outcome: ${formatCurrency(summary.netEarnings, true)}`}
                accent="#0f766e"
              />
              <SummaryCard
                title="Player Losses"
                value={formatCurrency(summary.totalLoss)}
                helper="Aggregate loss across all losing players"
                accent="#b91c1c"
              />
            </Stack>
          )}

          <SmartDataGrid
            columns={columns}
            fetchRows={fetchRows}
            getRowId={(row) => row.userId}
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            density="compact"
            initialSortModel={[{ field: "totalPrize", sort: "desc" }]}
            initialExtraFilters={defaultFilters}
            renderFilters={renderFilters}
            showToolbar
            footerSummary={footerSummary}
            sx={{
              "& .MuiDataGrid-row": {
                bgcolor: "transparent",
              },
              "& .MuiDataGrid-row:nth-of-type(odd)": {
                bgcolor: "rgba(148, 163, 184, 0.08)",
              },
              "& .MuiDataGrid-columnHeaders": {
                py: 1.2,
              },
              "& .MuiDataGrid-cell": {
                py: 1.25,
              },
              "& .MuiDataGrid-virtualScrollerContent": {
                pb: 6,
              },
              "& .MuiDataGrid-footerContainer": {
                py: 1.5,
              },
            }}
          />
        </Stack>
      </Paper>
    </Box>
  );
};

export default AdminLeaderboard;
