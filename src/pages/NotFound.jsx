import React from "react";
import { Box, Typography, Button } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useNavigate } from "react-router-dom";

export default function NotFound({ message = "The page you're looking for doesn't exist." }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "60vh",
        gap: 2,
        py: 8,
      }}
    >
      <SearchOffIcon sx={{ fontSize: 80, color: "text.disabled" }} />
      <Typography variant="h2" fontWeight="bold" color="text.primary">
        404
      </Typography>
      <Typography variant="h6" color="text.secondary" textAlign="center">
        {message}
      </Typography>
      <Button variant="contained" onClick={() => navigate("/home")} sx={{ mt: 2 }}>
        Go Home
      </Button>
    </Box>
  );
}
