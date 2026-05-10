import {
  Box,
  Typography,
  Paper,
  Divider,
} from "@mui/material";

export default function SectionWrapper({ title, children, actions }) {
  return (
    <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {title}
        </Typography>
        {actions}
      </Box>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );
}