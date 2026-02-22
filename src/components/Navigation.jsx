import React, { useState, useEffect, useRef } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  IconButton,
  Divider,
  Tooltip,
  Badge,
} from "@mui/material";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useNavigate, useLocation } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import MessageIcon from "@mui/icons-material/Message";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ExploreIcon from "@mui/icons-material/Explore";
import { useTheme } from "../context/ThemeContext";

const drawerWidthExpanded = 250;
const drawerWidthCollapsed = 80;

export default function Navigation({ user, isExpanded, setIsExpanded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  // Poll unread message count every 30s
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/messages/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(res.data.count || 0);
      } catch {
        // silent
      }
    };

    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Clear badge when on the messages page
  useEffect(() => {
    if (location.pathname === "/messages") setUnreadCount(0);
  }, [location.pathname]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const toggleDrawer = () => {
    setLocalExpanded(!localExpanded);
    setIsExpanded(!localExpanded);
  };

  const navItems = [
    { label: "Home", icon: <HomeIcon />, path: "/home" },
    { label: "Search", icon: <SearchIcon />, path: "/search" },
    { label: "Create", icon: <AddCircleIcon />, path: "/create" },
    {
      label: "Messages",
      icon: (
        <Badge badgeContent={unreadCount} color="error" max={9}>
          <MessageIcon />
        </Badge>
      ),
      path: "/messages",
    },
    { label: "Trips", icon: <ExploreIcon />, path: "/trips" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: localExpanded ? drawerWidthExpanded : drawerWidthCollapsed,
        flexShrink: 0,
        transition: "width 0.3s ease",
        "& .MuiDrawer-paper": {
          width: localExpanded ? drawerWidthExpanded : drawerWidthCollapsed,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          overflowX: "hidden",
        },
      }}
    >
      {/* Navigation Items */}
      <Box sx={{ flexGrow: 1, pt: 3 }}>
        <List>
          {navItems.map((item) => (
            <Tooltip
              key={item.path}
              title={!localExpanded ? item.label : ""}
              placement="right"
            >
              <ListItem
                onClick={() => handleNavigation(item.path)}
                sx={{
                  backgroundColor: isActive(item.path) ? "action.selected" : "transparent",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    cursor: "pointer",
                  },
                  justifyContent: localExpanded ? "flex-start" : "center",
                  px: localExpanded ? 2 : 1,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: localExpanded ? 40 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {localExpanded && <ListItemText primary={item.label} />}
              </ListItem>
            </Tooltip>
          ))}
        </List>
      </Box>

      {/* Bottom Section */}
      <Divider />
      <Box
        sx={{
          p: localExpanded ? 2 : 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: localExpanded ? "flex-start" : "center",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        {/* Dark mode toggle + Settings — side by side when expanded, stacked when collapsed */}
        <Box sx={{ display: "flex", gap: 1, flexDirection: localExpanded ? "row" : "column", alignItems: "center" }}>
          <Tooltip title={darkMode ? "Light mode" : "Dark mode"} placement="right">
            <IconButton onClick={toggleDarkMode} sx={{ width: 40, height: 40 }}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={!localExpanded ? "Settings" : ""} placement="right">
            <IconButton onClick={() => handleNavigation("/settings")} sx={{ width: 40, height: 40 }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Section - Show Avatar Always */}
        <Tooltip
          title={!localExpanded ? user?.username || "Profile" : ""}
          placement="right"
        >
          <Box
            onClick={() => { const id = user?._id; if (id) handleNavigation(`/profile/${id}`); }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 1,
              borderRadius: 1,
              cursor: "pointer",
              width: localExpanded ? "100%" : "auto",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            <Avatar
              src={user?.avatar}
              sx={{ width: 40, height: 40, flexShrink: 0 }}
            >
              {!user?.avatar && <PersonIcon />}
            </Avatar>
            {localExpanded && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.username || "User"}
                </Box>
                <Box
                  sx={{
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  @{user?.username || "user"}
                </Box>
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Collapse/Expand Button - Always on Right */}
      <Box
        sx={{
          p: 1,
          display: "flex",
          justifyContent: localExpanded ? "flex-end" : "center",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <IconButton
          onClick={toggleDrawer}
          sx={{
            "&:hover": {
              cursor: "pointer",
            },
          }}
          size="small"
        >
          {localExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
    </Drawer>
  );
}
