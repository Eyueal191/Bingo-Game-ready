import React, { useState, useEffect, useCallback } from "react";
import { useApi } from "../../../contexts/ApiContext";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Modal,
  Box,
  TextField,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import { Delete, Edit, RestartAlt } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const API_URL = `/api/v1/gamerooms`;
const STATIC_USER_ID = "64f1a2b3c4d5e6f7a8b9c0d1";

const GameRoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const api = useApi();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newRoomData, setNewRoomData] = useState({ stakeAmount: "" });
  const [updateRoomData, setUpdateRoomData] = useState({
    status: "",
    numberOfPlayers: "",
    winAmount: "",
    stakeAmount: "",
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Fetch all game rooms
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(API_URL);
      setRooms(response.data);
      setError(null);
    } catch (error) {
      console.error(error);
      setError("Failed to fetch game rooms");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Create a new game room
  const handleCreateRoom = async () => {
    if (!newRoomData.stakeAmount || isNaN(newRoomData.stakeAmount)) {
      setNotification({
        open: true,
        message: "Stake amount must be a number",
        severity: "error",
      });
      return;
    }

    try {
      const response = await api.post(API_URL, {
        stakeAmount: Number(newRoomData.stakeAmount),
        createdBy: STATIC_USER_ID,
      });

      setRooms([...rooms, response.data]);
      setCreateModalOpen(false);
      setNewRoomData({ stakeAmount: "" });
      setNotification({
        open: true,
        message: "Game room created successfully",
        severity: "success",
      });
    } catch (err) {
      setNotification({
        open: true,
        message:
          err.response.data.message ||
          err.message ||
          "Failed to create game room",
        severity: "error",
      });
    }
  };

  // Delete a game room
  const handleDeleteRoom = async (roomId) => {
    try {
      await api.delete(`${API_URL}/${roomId}`);
      setRooms(rooms.filter((room) => room._id !== roomId));
      setNotification({
        open: true,
        message: "Game room deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: "Failed to delete game room",
        severity: "error",
      });
    }
  };

  // Open update modal with current room data
  const handleOpenUpdateModal = (room) => {
    setSelectedRoom(room);
    setUpdateRoomData({
      status: room.status || "",
      numberOfPlayers: room.numberOfPlayers || "",
      winAmount: room.winAmount || "",
      stakeAmount: room.stakeAmount || "",
    });
    setUpdateModalOpen(true);
  };

  // Update a game room
  const handleUpdateRoom = async () => {
    const payload = {};
    if (updateRoomData.status) payload.status = updateRoomData.status;
    if (updateRoomData.numberOfPlayers !== "")
      payload.numberOfPlayers = Number(updateRoomData.numberOfPlayers);
    if (updateRoomData.winAmount !== "")
      payload.winAmount = Number(updateRoomData.winAmount);
    if (updateRoomData.stakeAmount !== "")
      payload.stakeAmount = Number(updateRoomData.stakeAmount);

    if (Object.keys(payload).length === 0) {
      setNotification({
        open: true,
        message: "No changes to update",
        severity: "warning",
      });
      return;
    }

    try {
      const response = await api.put(`${API_URL}/${selectedRoom._id}`, payload);
      setRooms(
        rooms.map((room) =>
          room._id === selectedRoom._id ? response.data : room
        )
      );
      setUpdateModalOpen(false);
      setNotification({
        open: true,
        message: "Game room updated successfully",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: "Failed to update game room",
        severity: "error",
      });
    }
  };

  // Reset a game room
  const handleResetRoom = async (roomId) => {
    try {
      const response = await api.put(`${API_URL}/${roomId}`, {
        status: "waiting",
        numberOfPlayers: 0,
        winAmount: 0,
      });
      setRooms(
        rooms.map((room) => (room._id === roomId ? response.data : room))
      );
      setNotification({
        open: true,
        message: "Game room reset successfully",
        severity: "success",
      });
    } catch (error) {
      console.error(error);
      setNotification({
        open: true,
        message: "Failed to reset game room",
        severity: "error",
      });
    }
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: { xs: "90%", sm: 400 },
    bgcolor: "background.paper",
    boxShadow: 24,
    p: { xs: 2, sm: 4 },
    borderRadius: "8px",
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 4, md: 6 },
        bgcolor: "background.default",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
        <Typography
          variant={isMobile ? "h5" : "h4"}
          sx={{
            textAlign: "center",
            mb: 4,
            fontWeight: "bold",
            color: "text.primary",
            background: "linear-gradient(90deg, #3f51b5, #9c27b0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Game Room Management
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => setCreateModalOpen(true)}
          sx={{ mb: 4, minWidth: 120 }}
        >
          Add New Room
        </Button>

        {loading ? (
          <Typography sx={{ textAlign: "center", color: "text.secondary" }}>
            Loading...
          </Typography>
        ) : error ? (
          <Typography sx={{ textAlign: "center", color: "error.main" }}>
            {error}
          </Typography>
        ) : (
          <TableContainer
            component={Paper}
            sx={{ boxShadow: 3, bgcolor: "background.paper", borderRadius: 2 }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "primary.main" }}>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: 1,
                    }}
                  >
                    Stake Amount
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: 1,
                    }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: 1,
                    }}
                  >
                    Players
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: 1,
                    }}
                  >
                    Win Amount
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      py: 1,
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow
                    key={room._id}
                    sx={{ "&:hover": { bgcolor: "action.hover" } }}
                  >
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: 1,
                        color: "text.primary",
                      }}
                    >
                      {room.stakeAmount} Birr
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: 1,
                        color: "text.primary",
                      }}
                    >
                      {room.status}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: 1,
                        color: "text.primary",
                      }}
                    >
                      {room.numberOfPlayers}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                        py: 1,
                        color: "text.primary",
                      }}
                    >
                      {room.winAmount} Birr
                    </TableCell>
                    <TableCell sx={{ py: 1 }}>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenUpdateModal(room)}
                        title="Edit Room"
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <Edit fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteRoom(room._id)}
                        title="Delete Room"
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <Delete fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                      <IconButton
                        color="secondary"
                        onClick={() => handleResetRoom(room._id)}
                        title="Reset Room"
                        sx={{ p: { xs: 0.5, sm: 1 } }}
                      >
                        <RestartAlt fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Create Room Modal */}
        <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
          <Box sx={modalStyle}>
            <Stack spacing={2}>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "text.primary", fontWeight: "bold" }}
              >
                Create New Game Room
              </Typography>
              <TextField
                label="Stake Amount (Birr)"
                value={newRoomData.stakeAmount}
                onChange={(e) =>
                  setNewRoomData({ stakeAmount: e.target.value })
                }
                fullWidth
                type="number"
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                  "& .MuiInputBase-input": { color: "text.primary" },
                }}
              />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setCreateModalOpen(false)}
                  sx={{ minWidth: 100 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateRoom}
                  sx={{ minWidth: 100 }}
                >
                  Create
                </Button>
              </Box>
            </Stack>
          </Box>
        </Modal>

        {/* Update Room Modal */}
        <Modal open={updateModalOpen} onClose={() => setUpdateModalOpen(false)}>
          <Box sx={modalStyle}>
            <Stack spacing={2}>
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "text.primary", fontWeight: "bold" }}
              >
                Update Game Room: {selectedRoom?.stakeAmount}
              </Typography>
              <TextField
                label="Status (waiting, starting, playing)"
                value={updateRoomData.status}
                onChange={(e) =>
                  setUpdateRoomData({
                    ...updateRoomData,
                    status: e.target.value,
                  })
                }
                fullWidth
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                  "& .MuiInputBase-input": { color: "text.primary" },
                }}
              />
              <TextField
                label="Number of Players"
                value={updateRoomData.numberOfPlayers}
                onChange={(e) =>
                  setUpdateRoomData({
                    ...updateRoomData,
                    numberOfPlayers: e.target.value,
                  })
                }
                fullWidth
                type="number"
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                  "& .MuiInputBase-input": { color: "text.primary" },
                }}
              />
              <TextField
                label="Win Amount (Birr)"
                value={updateRoomData.winAmount}
                onChange={(e) =>
                  setUpdateRoomData({
                    ...updateRoomData,
                    winAmount: e.target.value,
                  })
                }
                fullWidth
                type="number"
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                  "& .MuiInputBase-input": { color: "text.primary" },
                }}
              />
              <TextField
                label="Stake Amount (Birr)"
                value={updateRoomData.stakeAmount}
                onChange={(e) =>
                  setUpdateRoomData({
                    ...updateRoomData,
                    stakeAmount: e.target.value,
                  })
                }
                fullWidth
                type="number"
                sx={{
                  "& .MuiInputBase-root": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                  "& .MuiInputLabel-root": { color: "text.secondary" },
                  "& .MuiInputBase-input": { color: "text.primary" },
                }}
              />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setUpdateModalOpen(false)}
                  sx={{ minWidth: 100 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdateRoom}
                  sx={{ minWidth: 100 }}
                >
                  Update
                </Button>
              </Box>
            </Stack>
          </Box>
        </Modal>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={3000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert severity={notification.severity}>{notification.message}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default GameRoomManagement;
