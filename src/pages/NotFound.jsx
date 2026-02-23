import React from "react";
import { Box, Typography, Button } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      >
        <motion.div
          variants={itemVariants}
          animate={{ y: [0, -10, 0] }}
          transition={{ y: { delay: 0.6, duration: 1.6, repeat: Infinity, ease: "easeInOut" } }}
        >
          <SearchOffIcon sx={{ fontSize: 80, color: "text.disabled" }} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Typography variant="h2" fontWeight="bold" color="text.primary">
            404
          </Typography>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Typography variant="h6" color="text.secondary" textAlign="center">
            {message}
          </Typography>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Button variant="contained" onClick={() => navigate("/home")} sx={{ mt: 1 }}>
            Go Home
          </Button>
        </motion.div>
      </motion.div>
    </Box>
  );
}
