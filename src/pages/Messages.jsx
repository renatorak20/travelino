import React from "react";
import { Container, Box, Typography } from "@mui/material";

export default function Messages() {
  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Messages
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Your messages and conversations. This page is coming soon.
        </Typography>
      </Box>
    </Container>
  );
}
