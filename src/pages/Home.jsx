import React from "react";
import { Container, Box, Typography } from "@mui/material";

export default function Home() {
  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Home
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Welcome to your home feed! This page is coming soon.
        </Typography>
      </Box>
    </Container>
  );
}
