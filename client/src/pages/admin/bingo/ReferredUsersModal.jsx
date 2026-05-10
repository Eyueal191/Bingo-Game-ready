import React, { useMemo, useCallback } from "react";
import { Modal, Box, Typography, IconButton } from "@mui/material";
import SmartDataGrid from "../../../components/admin/SmartDataGrid";
import CloseIcon from "@mui/icons-material/Close";

const ReferredUsersModal = ({ open, onClose, users, agentName }) => {
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
          <Typography variant="h6">Referred Users by {agentName}</Typography>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 200, overflow: "auto" }}>
          <SmartDataGrid
            columns={useMemo(
              () => [
                {
                  field: "fullName",
                  headerName: "Full Name",
                  flex: 1,
                  minWidth: 160,
                  renderCell: (p) =>
                    p?.row?.fullName || p?.row?.telegramId || "-",
                },
                {
                  field: "phone",
                  headerName: "Phone",
                  flex: 1,
                  minWidth: 140,
                  renderCell: (p) => p?.row?.phone || "-",
                },
              ],
              []
            )}
            fetchRows={useCallback(
              async ({ page, pageSize, quickFilter, sortModel }) => {
                let data = Array.isArray(users) ? users.slice() : [];
                const q = (quickFilter || "").trim().toLowerCase();
                if (q) {
                  data = data.filter(
                    (u) =>
                      (u.fullName || u.telegramId || "")
                        .toLowerCase()
                        .includes(q) ||
                      String(u.phone || "")
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
                      return sort === "asc"
                        ? String(av ?? "").localeCompare(String(bv ?? ""))
                        : String(bv ?? "").localeCompare(String(av ?? ""));
                    });
                  }
                }
                const rowCount = data.length;
                const start = page * pageSize;
                const end = start + pageSize;
                const rows = data
                  .slice(start, end)
                  .map((u) => ({ ...u, id: u._id }));
                return { rows, rowCount };
              },
              [users]
            )}
            initialPageSize={5}
            pageSizeOptions={[5, 10, 15, 25, 50]}
            dynamicHeight
          />
        </Box>
      </Box>
    </Modal>
  );
};

export default ReferredUsersModal;
