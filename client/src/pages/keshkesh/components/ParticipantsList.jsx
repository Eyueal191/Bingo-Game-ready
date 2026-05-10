import React from "react";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";

const ParticipantsList = ({ participants }) => (
  <Box sx={{ mt: 4 }}>
    <Typography variant="h6" gutterBottom>
      ተሳታፊዎች ({participants.length})
    </Typography>
    <List
      sx={{
        bgcolor: "white",
        borderRadius: 2,
        boxShadow: 3,
        maxHeight: "300px",
        overflowY: "auto",
      }}
    >
      {participants.map((participant) => (
        <ListItem key={participant.user_id} divider>
          <ListItemText
            primary={participant.full_name || "Unknown"}
            secondary={`Numbers: ${participant.numbers.join(", ")} | ሁኔታ: ${participant.paid_status} | ደረጃ: ${
              participant.rank?.length > 0 ? participant.rank.sort().join(", ") : "None"
            }`}
            primaryTypographyProps={{ style: { color: "black" } }}
          />
        </ListItem>
      ))}
    </List>
  </Box>
);

export default ParticipantsList;
