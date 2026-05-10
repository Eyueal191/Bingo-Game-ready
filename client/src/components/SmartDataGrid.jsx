import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { Box } from "@mui/system";
import {
  DataGrid,
  GridPagination,
  GridFooterContainer,
  useGridApiContext,
  useGridSelector,
  gridRowCountSelector,
  gridPaginationModelSelector,
} from "@mui/x-data-grid";
import { Paper, IconButton, Tooltip } from "@mui/material";
import LastPageIcon from "@mui/icons-material/LastPage";

/**
 * SmartDataGrid
 * A reusable server-driven data grid with MUI theme integration.
 *
 * Props:
 * - columns: DataGrid column definitions
 * - fetchRows: async ({ page, pageSize, sortModel, filterModel, quickFilter, extraFilters }) => { rows, rowCount }
 * - getRowId: optional function to derive row id
 * - initialPageSize: number (default 10)
 * - pageSizeOptions: number[] (default [5,10,25,50,100])
 * - checkboxSelection: boolean
 * - density: 'compact' | 'standard' | 'comfortable'
 * - initialSortModel, initialFilterModel, initialQuickFilter
 * - renderFilters: optional render prop ({ filters, setFilters, refresh }) => ReactNode
 * - initialExtraFilters: object passed to fetchRows
 * - processRowUpdate: optional function for inline updates (MIT supports)
 */
const SmartDataGrid = ({
  columns,
  fetchRows,
  getRowId,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  checkboxSelection = false,
  density = "standard",
  initialSortModel = [],
  initialFilterModel = { items: [] },
  initialQuickFilter = "",
  renderFilters,
  initialExtraFilters = {},
  processRowUpdate,
  initialState,
  columnVisibilityModel,
  onColumnVisibilityModelChange,
  onReady,
  showToolbar = true,
  height = 560,
  dynamicHeight = true,
  sx,
  footerSummary,
}) => {
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortModel, setSortModel] = useState(initialSortModel);
  const [filterModel, setFilterModel] = useState(initialFilterModel);
  const [quickFilter, setQuickFilter] = useState(initialQuickFilter);
  const [extraFilters, setExtraFilters] = useState(initialExtraFilters);
  const lastFetchRef = useRef({ key: "", loading: false });

  function CustomPagination() {
    const apiRef = useGridApiContext();
    const { page, pageSize } = useGridSelector(
      apiRef,
      gridPaginationModelSelector
    );
    const rowCount = useGridSelector(apiRef, gridRowCountSelector) ?? 0;
    const lastPage = Math.max(
      0,
      Math.ceil(rowCount / Math.max(pageSize, 1)) - 1
    );
    const goLast = () => apiRef.current.setPage(lastPage);
    const disabled = page >= lastPage;
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <GridPagination />
        <Tooltip title="Last page">
          <span>
            <IconButton size="small" onClick={goLast} disabled={disabled}>
              <LastPageIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  }

  function CustomFooter() {
    return (
      <GridFooterContainer
        sx={{
          px: 1,
          py: 0.5,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          gap: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            flexWrap: "wrap",
            rowGap: 0.5,
            columnGap: 1,
            overflowX: "auto",
          }}
        >
          {footerSummary}
        </Box>
        <Box
          sx={{
            ml: { xs: 0, sm: "auto" },
            width: { xs: "100%", sm: "auto" },
            display: "flex",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          <CustomPagination />
        </Box>
      </GridFooterContainer>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const args = {
        page,
        pageSize,
        sortModel,
        filterModel,
        quickFilter,
        extraFilters,
      };
      const key = JSON.stringify(args);
      if (lastFetchRef.current.key === key && lastFetchRef.current.loading) {
        // Prevent back-to-back same-params fetch
        return;
      }
      lastFetchRef.current = { key, loading: true };
      const res = await fetchRows(args);
      setRows(res?.rows || []);
      setRowCount(res?.rowCount ?? (res?.rows?.length || 0));
    } finally {
      lastFetchRef.current.loading = false;
      setLoading(false);
    }
  }, [
    fetchRows,
    page,
    pageSize,
    sortModel,
    filterModel,
    quickFilter,
    extraFilters,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  // Expose helpers to parent
  useEffect(() => {
    if (typeof onReady === "function") {
      onReady({ refresh: load, setFilters: setExtraFilters });
    }
  }, [onReady, load]);

  // Debounce quick filter client-side input triggering fetch
  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 400);
    return () => clearTimeout(t);
  }, [quickFilter, load]);

  const toolbarSlotProps = useMemo(
    () => ({
      toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 400 } },
    }),
    []
  );

  // Enforce MIT page size limit (<= 100) to avoid runtime errors when consumers pass larger options.
  const safePageSizeOptions = useMemo(() => {
    const filtered = (pageSizeOptions || []).filter((n) => Number(n) <= 100);
    return filtered.length ? filtered : [5, 10, 25, 50, 100];
  }, [pageSizeOptions]);
  const safePageSize = pageSize > 100 ? 100 : pageSize;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {renderFilters && (
        <Box>
          {renderFilters({
            filters: extraFilters,
            setFilters: setExtraFilters,
            refresh: load,
          })}
        </Box>
      )}
      <Paper
        sx={{
          width: "100%",
          p: 0,
          bgcolor: "background.paper",
          overflowX: "auto",
        }}
        elevation={3}
      >
        <DataGrid
          rows={rows}
          getRowId={getRowId}
          columns={columns}
          loading={loading}
          autoHeight={!!dynamicHeight}
          showToolbar={showToolbar}
          initialState={initialState}
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={onColumnVisibilityModelChange}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          onPaginationModelChange={({ page: newPage, pageSize: newSize }) => {
            const nextSize = newSize > 100 ? 100 : newSize;
            if (nextSize !== pageSize) setPageSize(nextSize);
            if (newPage !== page) setPage(newPage);
          }}
          paginationModel={{ page, pageSize: safePageSize }}
          pageSizeOptions={safePageSizeOptions}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          filterMode="server"
          filterModel={filterModel}
          onFilterModelChange={setFilterModel}
          slots={{ pagination: CustomPagination, footer: CustomFooter }}
          slotProps={toolbarSlotProps}
          density={density}
          checkboxSelection={checkboxSelection}
          disableRowSelectionOnClick
          onStateChange={(state) => {
            // keep quick filter in sync
            const q = state.toolbar?.quickFilterValues?.join(" ") ?? "";
            setQuickFilter((prev) => (prev === q ? prev : q));
          }}
          processRowUpdate={processRowUpdate}
          experimentalFeatures={{ ariaV7: true }}
          sx={{
            // When autoHeight is enabled the grid grows to fit content,
            // ensuring the footer (including wrapped totals) is fully visible on small screens.
            // The explicit height is only used when dynamicHeight is false.
            height: dynamicHeight ? "auto" : height,
            border: 0,
            "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
            "& .MuiDataGrid-toolbarContainer": {
              gap: 1,
              p: 1,
            },
            "& .MuiDataGrid-main": { overflowX: "auto" },
            "& .MuiDataGrid-virtualScrollerContent": {
              width: "max-content",
              pr: 2,
            },
            ...sx,
          }}
        />
      </Paper>
    </Box>
  );
};

export default SmartDataGrid;
