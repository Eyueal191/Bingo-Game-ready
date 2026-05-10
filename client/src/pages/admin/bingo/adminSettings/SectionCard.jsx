import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

const SectionCard = ({ title, subtitle, children, footer }) => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
      {footer}
    </Stack>
  </Paper>
);

export default SectionCard;
