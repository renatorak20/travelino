import React, { useState } from "react";
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
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import MessageIcon from "@mui/icons-material/Message";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const drawerWidthExpanded = 250;
const drawerWidthCollapsed = 80;

export default function Navigation({ user, isSearchOpen, setIsSearchOpen, isExpanded, setIsExpanded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const handleNavigation = (path) => {
    if (path === "__search__drawer__") {
      setIsSearchOpen(!isSearchOpen);
    } else {
      navigate(path);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleDrawer = () => {
    setLocalExpanded(!localExpanded);
    setIsExpanded(!localExpanded);
  };

  const navItems = [
    { label: "Home", icon: <HomeIcon />, path: "/home" },
    { label: "Search", icon: <SearchIcon />, path: "__search__drawer__" },
    { label: "Create", icon: <AddCircleIcon />, path: "/create" },
    { label: "Messages", icon: <MessageIcon />, path: "/messages" },
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
        {/* Settings Icon Button - Circular */}
        <Tooltip title={!localExpanded ? "Settings" : ""} placement="right">
          <IconButton
            onClick={() => handleNavigation("/settings")}
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                cursor: "pointer",
              },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* Profile Section - Show Avatar Always */}
        <Tooltip
          title={!localExpanded ? user?.username || "Profile" : ""}
          placement="right"
        >
          <Box
            onClick={() => handleNavigation(`/profile/${localStorage.getItem("userId")}`)}
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
