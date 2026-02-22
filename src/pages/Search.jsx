import React, { useState, useRef } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Skeleton,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/users/search?query=${value}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data || []);
      } catch (err) {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Search
        </Typography>

        <TextField
          fullWidth
          placeholder="Search users..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          autoFocus
          sx={{ mb: 3 }}
        />

        {/* Skeleton rows while loading */}
        {loading && (
          <List disablePadding>
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItem key={i} sx={{ px: 0, gap: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="40%" height={22} />
                  <Skeleton variant="text" width="25%" height={16} />
                </Box>
              </ListItem>
            ))}
          </List>
        )}

        {/* No results */}
        {!loading && hasSearched && results.length === 0 && (
          <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography color="text.secondary">
              No users found for "{query}"
            </Typography>
          </Box>
        )}

        {/* Results list */}
        {!loading && results.length > 0 && (
          <Paper variant="outlined">
            <List disablePadding>
              {results.map((user, i) => (
                <ListItem
                  key={user._id}
                  onClick={() => navigate(`/profile/${user._id}`)}
                  divider={i < results.length - 1}
                  sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatar} sx={{ width: 48, height: 48 }}>
                      {!user.avatar && <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.username}
                    secondary={`@${user.username}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Initial prompt */}
        {!hasSearched && !loading && (
          <Box sx={{ textAlign: "center", mt: 8 }}>
            <SearchIcon sx={{ fontSize: 64, color: "text.disabled" }} />
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Search for users by username
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}
