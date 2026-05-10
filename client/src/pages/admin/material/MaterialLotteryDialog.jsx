import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  List,
  ListItem,
  Button,
  IconButton,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Delete, Add } from "@mui/icons-material";

const MaterialLotteryDialog = ({
  open,
  onClose,
  lotteryForm,
  onChangeForm,
  onChangeReward,
  onChangeRewardFile,
  addReward,
  removeReward,
  onSubmit,
  loading,
}) => {
  const isCreateDisabled =
    loading ||
    !lotteryForm.bet_amount ||
    !lotteryForm.max_players ||
    lotteryForm.rewards.some((r) => !r.description);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          width: "90%",
          maxHeight: "90vh",
          margin: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle>Create Material Lottery</DialogTitle>
      <DialogContent dividers sx={{ overflowY: "auto" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <TextField
            label="Bet Amount (ETB)"
            name="bet_amount"
            value={lotteryForm.bet_amount}
            onChange={onChangeForm}
            fullWidth
            margin="normal"
            type="number"
            required
            inputProps={{ min: 0, step: "0.01" }}
            size="small"
          />
          <TextField
            label="Max Players"
            name="max_players"
            value={lotteryForm.max_players}
            onChange={onChangeForm}
            fullWidth
            margin="normal"
            type="number"
            required
            inputProps={{ min: 1 }}
            size="small"
          />
        </Box>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Rewards
        </Typography>
        <List>
          {lotteryForm.rewards.map((reward, index) => (
            <ListItem
              key={index}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                alignItems: { xs: "stretch", sm: "center" },
                mb: 2,
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.paper",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  alignSelf: "flex-start",
                  mb: { xs: 1, sm: 0 },
                }}
              >
                Rank {index + 1}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  width: "100%",
                }}
              >
                <TextField
                  label={`Rank ${index + 1} Description`}
                  name="description"
                  value={reward.description}
                  onChange={(e) => onChangeReward(e, index)}
                  fullWidth
                  required
                  size="small"
                />
                <FormControl
                  sx={{ minWidth: { xs: "100%", sm: 200 } }}
                  size="small"
                >
                  <InputLabel>Type</InputLabel>
                  <Select
                    label="Type"
                    name="type"
                    value={reward.type}
                    onChange={(e) => onChangeReward(e, index)}
                    sx={{
                      "& .MuiSelect-select": {
                        py: 0.5,
                        fontSize: "0.875rem",
                      },
                    }}
                  >
                    <MenuItem value="material">Material</MenuItem>
                    <MenuItem value="monetary">Monetary</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              {reward.type === "monetary" && (
                <TextField
                  label="Amount (ETB)"
                  name="amount"
                  value={reward.amount}
                  onChange={(e) => onChangeReward(e, index)}
                  type="number"
                  required
                  size="small"
                  sx={{ width: "100%" }}
                  inputProps={{ min: 0, step: "0.01" }}
                />
              )}
              {reward.type === "material" && (
                <Box sx={{ width: "100%" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onChangeRewardFile(e, index)}
                    style={{ fontSize: "0.875rem" }}
                  />
                  {reward.file && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {reward.file.name}
                    </Typography>
                  )}
                </Box>
              )}
              {lotteryForm.rewards.length > 1 && (
                <IconButton onClick={() => removeReward(index)} size="small">
                  <Delete />
                </IconButton>
              )}
            </ListItem>
          ))}
        </List>
        <Button
          onClick={addReward}
          startIcon={<Add />}
          sx={{ mt: 1 }}
          variant="outlined"
          size="small"
        >
          Add Reward
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={isCreateDisabled}
          size="small"
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MaterialLotteryDialog;