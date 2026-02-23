import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import CreateTrip from "./pages/CreateTrip";
import NotFound from "./pages/NotFound";
import Search from "./pages/Search";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import axios from "axios";
import { API_BASE_URL } from "./config";

function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavExpanded, setIsNavExpanded] = useState(true);

  const noNavPages = ["/login", "/register"];
  const showNav = !noNavPages.includes(location.pathname) && !!user;

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

  const protect = (children) => (
    <ProtectedRoute user={user} loading={loading}>
      {children}
    </ProtectedRoute>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      {showNav && (
        <Navigation
          user={user}
          isExpanded={isNavExpanded}
          setIsExpanded={setIsNavExpanded}
        />
      )}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Routes>
              <Route path="/" element={protect(<Home />)} />
              <Route path="/login" element={<Login onLogin={fetchCurrentUser} />} />
              <Route path="/register" element={<Register onLogin={fetchCurrentUser} />} />
              <Route path="/not-found" element={<NotFound />} />

              <Route path="/home" element={protect(<Home />)} />
              <Route path="/create" element={protect(<Create />)} />
              <Route path="/messages" element={protect(<Messages />)} />
              <Route path="/search" element={protect(<Search />)} />
              <Route path="/profile" element={protect(<Profile />)} />
              <Route path="/profile/:userId" element={protect(<Profile />)} />
              <Route path="/settings" element={protect(<Settings />)} />
              <Route path="/trips" element={protect(<Trips />)} />
              <Route path="/trips/:tripId" element={protect(<TripDetail />)} />
              <Route path="/create-trip" element={protect(<CreateTrip />)} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}

export default App;
