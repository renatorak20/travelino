import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Box,
  Typography,
  Container,
  Paper,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Settings() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmail(res.data.email);
      } catch (err) {
        // ignore
      }
    };
    fetchUser();
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  const handleChangePassword = async () => {
    try {
      setError("");
      setSuccess("");

      if (!passwordData.currentPassword || !passwordData.newPassword) {
        setError("All fields are required");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    }
  };

  const handleBackToProfile = () => {
    const userId = localStorage.getItem("userId");
    if (userId) navigate(`/profile/${userId}`);
    else navigate("/home");
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ py: 4 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToProfile}
          sx={{ mb: 3 }}
        >
          Back to Profile
        </Button>

        {/* Page Title */}
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Settings
        </Typography>

        {/* Messages */}
        {error && (
          <Box sx={{ mb: 2 }}>
            <Typography color="error" variant="body2" sx={{ p: 2, bgcolor: "#ffebee", borderRadius: 1 }}>
              {error}
            </Typography>
          </Box>
        )}
        {success && (
          <Box sx={{ mb: 2 }}>
            <Typography color="success.main" variant="body2" sx={{ p: 2, bgcolor: "#e8f5e9", borderRadius: 1 }}>
              {success}
            </Typography>
          </Box>
        )}

        {/* Account Info */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <TextField
            fullWidth
            label="Email"
            value={email}
            disabled
            variant="outlined"
          />
        </Paper>

        {/* Change Password */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              variant="outlined"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleChangePassword}
              fullWidth
              sx={{ mt: 2 }}
            >
              Change Password
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
