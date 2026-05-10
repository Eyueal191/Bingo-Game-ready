import React, { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  Pagination,
  PaginationItem,
  Skeleton,
} from "@mui/material";
import {
  ArrowBackIos,
  ArrowForwardIos,
  CheckCircle,
  Schedule,
  Cancel,
  SouthWest,
  NorthEast,
  SwapHoriz,
} from "@mui/icons-material";

const TransactionHistory = ({ transactions = [], isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
      case "success":
        return {
          icon: <CheckCircle sx={{ fontSize: { xs: 12, sm: 14 } }} />,
          color: "var(--color-bingo-green)",
          bg: "rgba(85,255,119,0.12)",
        };
      case "pending":
        return {
          icon: <Schedule sx={{ fontSize: { xs: 12, sm: 14 } }} />,
          color: "var(--color-bingo-yellow)",
          bg: "rgba(248,213,23,0.12)",
        };
      case "failed":
      case "rejected":
        return {
          icon: <Cancel sx={{ fontSize: { xs: 12, sm: 14 } }} />,
          color: "var(--color-bingo-red)",
          bg: "rgba(255,59,48,0.12)",
        };
      default:
        return {
          icon: null,
          color: "var(--color-bingo-muted)",
          bg: "rgba(255,255,255,0.05)",
        };
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "deposit":
        return <SouthWest sx={{ fontSize: { xs: 12, sm: 14 }, color: "var(--color-bingo-green)" }} />;
      case "withdraw":
        return <NorthEast sx={{ fontSize: { xs: 12, sm: 14 }, color: "var(--color-bingo-red)" }} />;
      default:
        return <SwapHoriz sx={{ fontSize: { xs: 12, sm: 14 }, color: "var(--color-bingo-yellow)" }} />;
    }
  };

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentItems = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 900, mx: "auto" }}>
        <Skeleton variant="rounded" height={40} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: "12px" }} />
        <Skeleton variant="rounded" height={360} sx={{ bgcolor: "rgba(255,255,255,0.05)", borderRadius: "20px" }} />
      </Box>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 10, maxWidth: 900, mx: "auto" }}>
        <Typography sx={{ color: "var(--color-bingo-muted)", fontSize: "1rem", fontWeight: 500 }}>
          No transactions found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 800, mx: "auto", transition: "opacity 0.5s" }}>
      <Typography
        sx={{
          fontWeight: 900,
          color: "var(--color-bingo-white)",
          fontSize: { xs: "1.05rem", sm: "1.3rem" },
          textAlign: "center",
          mb: { xs: 2.5, sm: 3 },
          opacity: 0.95,
          letterSpacing: 0.5,
        }}
      >
        Transaction History
      </Typography>

      <Box
        sx={{
          background: "var(--color-bingo-card)",
          borderRadius: { xs: "20px", sm: "24px" },
          border: "1px solid rgba(255, 255, 255, 0.06)",
          overflow: "hidden",
          boxShadow: "0 12px 48px var(--color-bingo-shadow)",
        }}
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table size={window.innerWidth < 600 ? "small" : "medium"}>
            <TableHead>
              <TableRow sx={{ background: "rgba(255, 255, 255, 0.02)" }}>
                {["Type", "Amount", "Date", "Status"].map((label) => (
                  <TableCell
                    key={label}
                    padding="none"
                    sx={{
                      color: "var(--color-bingo-yellow)",
                      fontWeight: 800,
                      textAlign: "center",
                      fontSize: { xs: "0.65rem", sm: "0.8rem" },
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      py: { xs: 1.5, sm: 2 },
                      px: { xs: 1, sm: 2 },
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentItems.map((tx, index) => {
                const status = getStatusInfo(tx.status);
                const isDebit = tx.type === "withdraw" || tx.type === "transfer";

                return (
                  <TableRow
                    key={tx._id || index}
                    sx={{
                      background: index % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "transparent",
                      "&:hover": {
                        background: "rgba(255, 255, 255, 0.03)",
                        transition: "background 0.2s ease"
                      },
                    }}
                  >
                    <TableCell
                      padding="none"
                      sx={{
                        py: { xs: 1.2, sm: 2.5 },
                        px: { xs: 1, sm: 2 },
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: { xs: 0.8, sm: 1.2 } }}>
                        {getTypeIcon(tx.type)}
                        <Typography sx={{
                          color: "var(--color-bingo-white)",
                          fontSize: { xs: "0.65rem", sm: "0.9rem" },
                          fontWeight: 700
                        }}>
                          {tx.type?.charAt(0).toUpperCase() + tx.type?.slice(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      padding="none"
                      sx={{
                        color: isDebit ? "var(--color-bingo-red)" : "var(--color-bingo-green)",
                        textAlign: "center",
                        fontSize: { xs: "0.7rem", sm: "1rem" },
                        fontWeight: 900,
                        py: { xs: 1.2, sm: 2.5 },
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {isDebit ? "-" : "+"}{tx.amount?.toLocaleString()}
                    </TableCell>
                    <TableCell
                      padding="none"
                      sx={{
                        color: "var(--color-bingo-muted)",
                        textAlign: "center",
                        fontSize: { xs: "0.6rem", sm: "0.85rem" },
                        fontWeight: 500,
                        py: { xs: 1.2, sm: 2.5 },
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {format(new Date(tx.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell
                      padding="none"
                      sx={{
                        textAlign: "center",
                        py: { xs: 1.2, sm: 2.5 },
                        px: { xs: 1, sm: 2 },
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: { xs: 0.5, sm: 0.8 },
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.4, sm: 0.8 },
                          borderRadius: { xs: "8px", sm: "10px" },
                          background: status.bg,
                          color: status.color,
                        }}
                      >
                        {status.icon}
                        <Typography sx={{
                          fontSize: { xs: "0.6rem", sm: "0.8rem" },
                          fontWeight: 800,
                          textTransform: "capitalize"
                        }}>
                          {tx.status}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {totalPages > 1 && (
          <Box sx={{
            py: { xs: 2.5, sm: 3 },
            display: "flex",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.01)",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)"
          }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(e, p) => handlePageChange(p)}
              size={window.innerWidth > 600 ? "medium" : "small"}
              renderItem={(item) => (
                <PaginationItem
                  slots={{ previous: ArrowBackIos, next: ArrowForwardIos }}
                  {...item}
                  sx={{
                    color: "var(--color-bingo-muted)",
                    fontWeight: 600,
                    "&.Mui-selected": {
                      background: "var(--color-bingo-yellow)",
                      color: "#000",
                      fontWeight: 800,
                      "&:hover": {
                        background: "var(--color-bingo-yellow-dark)",
                      }
                    },
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.05)",
                    }
                  }}
                />
              )}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TransactionHistory;