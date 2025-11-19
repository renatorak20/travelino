import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
// import Search from "./pages/Search";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import Navigation from "./components/Navigation";
import SearchDrawer from "./components/SearchDrawer";
import axios from "axios";
import { API_BASE_URL } from "./config";

function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(true);

  // Pages that should not show the navigation drawer
  const noNavPages = ["/login", "/register"];
  const showNav = !noNavPages.includes(location.pathname);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      {showNav && (
        <Navigation 
          user={user} 
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          isExpanded={isNavExpanded}
          setIsExpanded={setIsNavExpanded}
        />
      )}
      <SearchDrawer 
        isOpen={isSearchOpen && isNavExpanded}
        onClose={() => setIsSearchOpen(false)}
      />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />

          <Route path="/create" element={<Create />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
