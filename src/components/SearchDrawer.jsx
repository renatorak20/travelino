import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.15 } },
};
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  Box,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";
import { API_BASE_URL } from "../config";

const searchDrawerWidth = 320;

export default function SearchDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setHasSearched(true);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_BASE_URL}/users/search?query=${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSearchResults(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <Drawer
      anchor="left"
      open={isOpen}
      onClose={onClose}
      variant="temporary"
      sx={{
        width: searchDrawerWidth,
        "& .MuiDrawer-paper": {
          width: searchDrawerWidth,
          boxSizing: "border-box",
          mt: 0,
        },
      }}
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", height: "100vh" }}>
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <CloseIcon
                  onClick={handleClear}
                  sx={{ cursor: "pointer" }}
                />
              </InputAdornment>
            ),
          }}
          size="small"
          variant="outlined"
          sx={{ mb: 2 }}
        />

        {/* Search Results */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}

          {!loading && hasSearched && searchResults.length === 0 && (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Typography color="textSecondary" variant="body2">
                No users found
              </Typography>
            </Box>
          )}

          {!loading && searchResults.length > 0 && (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              <List sx={{ p: 0 }}>
                <AnimatePresence>
                  {searchResults.map((user) => (
                    <motion.div
                      key={user._id}
                      variants={itemVariants}
                      exit="exit"
                      layout
                    >
                      <ListItem
                        sx={{
                          mb: 1,
                          borderRadius: 1,
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => {
                          onClose();
                          navigate(`/profile/${user._id}`);
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={user.avatar} sx={{ width: 40, height: 40 }}>
                            {!user.avatar && <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={user.username}
                          secondary={`@${user.username}`}
                          primaryTypographyProps={{
                            noWrap: true,
                            variant: "body2",
                          }}
                          secondaryTypographyProps={{
                            noWrap: true,
                            variant: "caption",
                          }}
                        />
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            </motion.div>
          )}

          {!hasSearched && searchResults.length === 0 && (
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Typography color="textSecondary" variant="body2">
                Search for users to get started
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
