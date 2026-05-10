import React, { useState, useCallback, useRef, useMemo } from "react";
import { Box, Typography, Button, useMediaQuery, useTheme } from "@mui/material";
import { useApi } from "../../../../contexts/ApiContext";
import toast, { Toaster } from "react-hot-toast";

import SmartDataGrid from "../../../../components/SmartDataGrid";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";

import { toNumber } from "./utils";
import { getColumns } from "./columns";
import WalletDialog from "./components/WalletDialog";
import BonusDialog from "./components/BonusDialog";
import RoleDialog from "./components/RoleDialog";
import BanDialog from "./components/BanDialog";
import UserSummary from "./components/UserSummary";
import Filters from "./components/Filters";

const AdminUsers = () => {
    const api = useApi();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const gridRefreshRef = useRef(null);
    const summarySectionRef = useRef(null);

    // States
    const [gridRows, setGridRows] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);

    // Dialog States
    const [walletDialog, setWalletDialog] = useState({ open: false, user: null });
    const [bonusDialog, setBonusDialog] = useState({ open: false, user: null });
    const [roleDialog, setRoleDialog] = useState({ open: false, user: null });
    const [banDialog, setBanDialog] = useState({ open: false, user: null, mode: "ban" });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null, loading: false });

    // Summary State
    const [summaryUser, setSummaryUser] = useState(null);

    const fetchUsers = useCallback(
        async ({ page, pageSize, sortModel, filterModel, quickFilter, extraFilters }) => {
            try {
                const queryParams = new URLSearchParams();
                const { startDate = "", endDate = "", search = "", role = "" } = extraFilters || {};
                const q = (search || quickFilter || "").trim();

                if (startDate) queryParams.append("startDate", startDate);
                if (endDate) queryParams.append("endDate", endDate);
                if (q) queryParams.append("search", q);
                if (role) queryParams.append("role", role);

                if (filterModel?.items?.length) {
                    queryParams.append("filters", JSON.stringify({
                        items: filterModel.items,
                        logicOperator: filterModel.logicOperator,
                    }));
                }

                if (sortModel?.[0]) {
                    const { field, sort } = sortModel[0];
                    queryParams.append("sortField", field);
                    queryParams.append("sortOrder", sort);
                }

                queryParams.append("page", page + 1);
                queryParams.append("limit", pageSize);

                const res = await api.get(`/api/v1/users/all?${queryParams.toString()}`);
                if (!res.data.success) throw new Error("Failed to fetch users");

                const rows = (res.data.users || []).map((u) => ({
                    ...u,
                    id: u._id,
                    wallet: toNumber(u.wallet),
                    bonus: toNumber(u.bonus),
                }));

                setGridRows(rows);
                setTotalUsers(res.data.totalUsers || rows.length);
                return { rows, rowCount: res.data.totalUsers || rows.length };
            } catch (error) {
                toast.error("Failed to fetch users");
                console.error("Fetch users error:", error);
                return { rows: [], rowCount: 0 };
            }
        },
        [api]
    );

    const totals = useMemo(() => {
        return {
            count: gridRows.length,
            wallet: gridRows.reduce((s, r) => s + toNumber(r.wallet), 0),
            bonus: gridRows.reduce((s, r) => s + toNumber(r.bonus), 0),
        };
    }, [gridRows]);

    const columns = useMemo(() => getColumns({
        theme,
        isMobile,
        onWalletClick: (user) => setWalletDialog({ open: true, user }),
        onBonusClick: (user) => setBonusDialog({ open: true, user }),
        onSummaryClick: (user) => {
            setSummaryUser(user);
            requestAnimationFrame(() => {
                summarySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        },
        onRoleClick: (user) => setRoleDialog({ open: true, user }),
        onBanClick: (user, isBanned) => setBanDialog({ open: true, user, mode: isBanned ? "unban" : "ban" }),
        onDeleteClick: (user) => setDeleteDialog({ open: true, user, loading: false }),
    }), [theme, isMobile]);

    const confirmDeleteUser = async () => {
        if (!deleteDialog.user?._id) return;
        try {
            setDeleteDialog((d) => ({ ...d, loading: true }));
            await api.delete(`/api/v1/users/delete/${deleteDialog.user._id}`);
            toast.success("User deleted");
            gridRefreshRef.current?.();
        } catch (e) {
            toast.error("Failed to delete user");
            console.error(e);
        } finally {
            setDeleteDialog({ open: false, user: null, loading: false });
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 1, sm: 2, md: 3 },
                bgcolor: "background.paper", borderRadius: 2, boxShadow: 3,
                minHeight: "calc(100vh - 64px)", overflowX: "auto",
            }}
        >
            <Toaster />
            <Typography
                variant={isMobile ? "h6" : "h5"}
                sx={{
                    color: "text.primary", mb: 2, fontWeight: "bold",
                    fontSize: { xs: "1rem", sm: "1.5rem" },
                    background: "linear-gradient(90deg, #116e51, #ff3b30)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}
            >
                User Management
            </Typography>

            <Box sx={{ mb: 2 }}>
                <SmartDataGrid
                    columns={columns}
                    fetchRows={fetchUsers}
                    getRowId={(row) => row._id || row.id}
                    initialPageSize={5}
                    pageSizeOptions={[5, 10, 15, 25, 50, 100, 500, 1000, 1500, 2000]}
                    density={isMobile ? "compact" : "standard"}
                    initialState={{
                        columns: {
                            columnVisibilityModel: {
                                referralCode: !isMobile,
                                invitedBy: !isMobile,
                                bonus: !isMobile,
                            },
                        },
                    }}
                    onReady={({ refresh }) => { gridRefreshRef.current = refresh; }}
                    dynamicHeight
                    maxAutoHeight={520}
                    sx={{
                        minWidth: 600,
                        overflowX: "auto",
                    }}
                    renderFilters={(props) => <Filters {...props} isMobile={isMobile} />}
                    footerSummary={
                        <Box
                            sx={{
                                display: "grid",
                                gridAutoFlow: "column",
                                gap: 2,
                                fontSize: 13,
                                // alignItems: "center",
                                // whiteSpace: "nowrap",
                                // overflow: "hidden",
                                // textOverflow: "ellipsis",
                                color: "text.secondary",
                            }}
                        >
                            <Box>Users: {(totals.count || 0).toLocaleString()}</Box>
                            <Box>Wallet: {(totals.wallet || 0).toLocaleString()} coins</Box>
                            <Box>Bonus: {(totals.bonus || 0).toLocaleString()} coins</Box>
                        </Box>
                    }
                />
            </Box>

            {/* Summary Section */}
            <div ref={summarySectionRef}>
                {summaryUser && (
                    <UserSummary
                        user={summaryUser}
                        api={api}
                        onClose={() => setSummaryUser(null)}
                    />
                )}
            </div>

            {/* Dialogs */}
            {walletDialog.open && (
                <WalletDialog
                    open={walletDialog.open}
                    user={walletDialog.user}
                    api={api}
                    onClose={() => setWalletDialog({ open: false, user: null })}
                    onUpdate={() => gridRefreshRef.current?.()}
                />
            )}

            {bonusDialog.open && (
                <BonusDialog
                    open={bonusDialog.open}
                    user={bonusDialog.user}
                    api={api}
                    onClose={() => setBonusDialog({ open: false, user: null })}
                    onUpdate={() => gridRefreshRef.current?.()}
                />
            )}

            {roleDialog.open && (
                <RoleDialog
                    open={roleDialog.open}
                    user={roleDialog.user}
                    api={api}
                    onClose={() => setRoleDialog({ open: false, user: null })}
                    onUpdate={() => gridRefreshRef.current?.()}
                />
            )}

            {banDialog.open && (
                <BanDialog
                    open={banDialog.open}
                    user={banDialog.user}
                    mode={banDialog.mode}
                    api={api}
                    onClose={() => setBanDialog({ open: false, user: null, mode: "ban" })}
                    onUpdate={() => gridRefreshRef.current?.()}
                />
            )}

            <ConfirmDialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, user: null, loading: false })}
                onConfirm={confirmDeleteUser}
                title={`Delete ${deleteDialog.user?.fullName || "user"}?`}
                description="This action is permanent and related data may be removed."
                confirmLabel="Delete"
                confirmColor="error"
                loading={deleteDialog.loading}
            />
        </Box>
    );
};

export default AdminUsers;
